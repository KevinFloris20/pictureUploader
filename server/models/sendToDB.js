const path = require('path');
const { uploadFile, createFolder, downloadFile } = require('./googleDriveService');
const { convertToJpgAndOptimizeSize } = require('./editImg');
const MAIN_FOLDER_ID = '1wlKANogfrk5cTnpCEAlX-mpMU26VQ5m0';
const { Readable } = require('stream');

const logMemoryUsage = (message) => {
    const memoryUsage = process.memoryUsage();
    console.log(`Memory Usage: RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB, Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB, Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB -- ${message}`);
};

async function withExponentialBackoff(operation, maxRetries = 5) {
    let retryCount = 0;
    let delay = 1000;
    while (retryCount < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            console.error(`Operation failed, retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            delay *= 2;
        }
    }
}

async function makeFirstFolder(name){
    let equipmentFolderId = await withExponentialBackoff(() => createFolder(name, MAIN_FOLDER_ID, true));
    return equipmentFolderId;
}

function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); 
    return stream;
}

/*this function will take all of the images sent from the client
and the parent folder id and upload them as is directly to google drive, 
this function also makes the file structure for each submit. 
Once this is done an array of image id's are passed to the next function*/
async function processAndUploadImages(equipmentFolderId, images) {
    logMemoryUsage('Start of processAndUploadImages');

    const beforeFolderId = await withExponentialBackoff(() => createFolder('Before', equipmentFolderId));
    const afterFolderId = await withExponentialBackoff(() => createFolder('After', equipmentFolderId));
    const updatedBeforeFolderId = await withExponentialBackoff(() => createFolder('Updated', beforeFolderId));
    const updatedAfterFolderId = await withExponentialBackoff(() => createFolder('Updated', afterFolderId));
    
    let imageIds = [];
    let nextArr = [];
    for (const { buffer, originalname, mimetype, fieldname } of images) {
        logMemoryUsage(`Processing image: ${originalname}`);
        const parentFolderId = fieldname === 'beforePic' ? beforeFolderId : afterFolderId;
        const stream = bufferToStream(buffer);
        const fileId = await withExponentialBackoff(() => uploadFile(stream, mimetype, parentFolderId, originalname));
        imageIds.push(fileId);
        nextArr.push({ fileId, updatedBeforeFolderId, updatedAfterFolderId, originalname, fieldname });
    }
    logMemoryUsage('End of processAndUploadImages sending array to transformAndUploadImage');
    transformAndUploadImage(nextArr);
    return imageIds; 
}

/*This function then downloads each picture from drive
send them to sharp.js for transformation, and then
takes the stream from sharp and reuploads them
into the updated folder and a new folder*/
async function transformAndUploadImage(arr) {
    let retryItems = [];

    async function processItem(item) {
        let stream = null;
        try {
            const { fileId, updatedBeforeFolderId, updatedAfterFolderId, originalname, fieldname } = item;
            logMemoryUsage('Start downloading file')
            stream = await downloadFile(fileId);
            logMemoryUsage('Finish Downloading, now sending to sharp.js')
            let transformedStream = convertToJpgAndOptimizeSize(stream);
            logMemoryUsage('End of sharp.js transformation')

            const newFileName = `Updated-${path.parse(originalname).name}.jpg`;
            const updatedFolderId = fieldname === 'beforePic' ? updatedBeforeFolderId : updatedAfterFolderId;
            logMemoryUsage('Start upload to drive')
            const newId = await withExponentialBackoff(() => uploadFile(transformedStream, 'image/jpeg', updatedFolderId, newFileName));
            logMemoryUsage('End upload to drive')
            transformedStream.destroy();
            console.log(`Image transformation and upload successful for ${fileId} -> ${newId}`);
        } catch (error) {
            console.error(`Error in image transformation for ${item.fileId}:`, error);
            retryItems.push(item);
        } finally {
            if (stream && typeof stream.destroy === 'function') {
                stream.destroy();
            }
            stream = null; 
        }
    }

    for (const item of arr) {
        console.log(`Processing item: ${item.fileId}`)
        await processItem(item);
        logMemoryUsage('End of processItem')
    }

    if (retryItems.length > 0) {
        console.log(`Retrying failed items...`);
        for (const item of retryItems) {
            await processItem(item);
        }
    }
}

module.exports = { processAndUploadImages, makeFirstFolder };

// const path = require('path');
// const { uploadFile, createFolder, downloadFile } = require('./googleDriveService');
// const { convertToJpgAndOptimizeSize } = require('./editImg');

// const MAIN_FOLDER_ID = '1wlKANogfrk5cTnpCEAlX-mpMU26VQ5m0';

// async function withExponentialBackoff(operation, maxRetries = 5) {
//     let retryCount = 0;
//     let delay = 1000;

//     while (retryCount < maxRetries) {
//         try {
//             return await operation();
//         } catch (error) {
//             if (retryCount === maxRetries - 1) {
//                 throw error;
//             }
//             console.error(`Operation failed, retrying in ${delay}ms...`, error);
//             await new Promise((resolve) => setTimeout(resolve, delay));
//             retryCount++;
//             delay *= 2;
//         }
//     }
// }

// class TransformationQueue {
//     constructor() {
//         this.queue = [];
//         this.processing = false;
//     }

//     async processQueue() {
//         if (this.processing) return;
//         this.processing = true;

//         while (this.queue.length > 0) {
//             const task = this.queue.shift(); 
//             try {
//                 await task();
//             } catch (error) {
//                 console.error('Error processing image transformation:', error);
//             }
//         }
//         this.processing = false;
//     }

//     addTask(task) {
//         this.queue.push(task);
//         this.processQueue(); 
//     }
// }
// const transformationQueue = new TransformationQueue();

// async function transformImgs(images, updatedBeforeFolderId, updatedAfterFolderId) {
//     for (const image of images) {
//         transformationQueue.addTask(async () => {
//             const buffer = await withExponentialBackoff(() => downloadFile(image.fileId));
//             const jpgBuffer = await convertToJpgAndOptimizeSize(buffer);
//             const newFileName = `${path.parse(image.originalname).name}.jpg`;
//             const folderId = image.fieldname === 'beforePic' ? updatedBeforeFolderId : updatedAfterFolderId;
            
//             await withExponentialBackoff(() => uploadFile(jpgBuffer, 'image/jpeg', folderId, newFileName));
//         });
//     }
// }

// async function processAndUploadImages(equipmentId, images) {
//     try {
//         const equipmentFolderId = await withExponentialBackoff(() => createFolder(equipmentId, MAIN_FOLDER_ID));
//         const beforeFolderId = await withExponentialBackoff(() => createFolder('Before', equipmentFolderId));
//         const afterFolderId = await withExponentialBackoff(() => createFolder('After', equipmentFolderId));
//         const updatedBeforeFolderId = await withExponentialBackoff(() => createFolder('Updated', beforeFolderId));
//         const updatedAfterFolderId = await withExponentialBackoff(() => createFolder('Updated', afterFolderId));

//         let imageDetails = [];
//         for (const image of images) {
//             const buffer = image.buffer;
//             const newFileName = image.originalname;
//             const folderId = image.fieldname === 'beforePic' ? beforeFolderId : afterFolderId;
//             const fileId = await withExponentialBackoff(() => uploadFile(buffer, image.mimetype, folderId, newFileName));
//             imageDetails.push({ fileId, originalname: newFileName, fieldname: image.fieldname });
//         }

//         transformImgs(imageDetails, updatedBeforeFolderId, updatedAfterFolderId);
//         console.log(`All original images processed and uploaded for equipment ID: ${equipmentId}`);
//     } catch (error) {
//         console.error('Error during image processing and uploading:', error);
//         throw error;
//     }
// }

// module.exports = { processAndUploadImages };
