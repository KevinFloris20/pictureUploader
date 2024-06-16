const path = require('path');
const { uploadFile, createFolder, downloadFile, uploadFile2, downloadFile2 } = require('./googleDriveService');
const { convertToJpgAndOptimizeSize } = require('./editImg');
const MAIN_FOLDER_ID = '1wlKANogfrk5cTnpCEAlX-mpMU26VQ5m0';
const { Readable } = require('stream');
const { pipeline } = require('stream');
const util = require('util');
const pipelineAsync = util.promisify(pipeline);

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
Once this is done an array of image id's are passed to the next function,
It does most of this functionality using a custom microservice on cloudrun*/
async function processAndUploadImages(equipmentFolderId, images) {

    const beforeFolderId = await withExponentialBackoff(() => createFolder('Before', equipmentFolderId));
    const afterFolderId = await withExponentialBackoff(() => createFolder('After', equipmentFolderId));
    const updatedBeforeFolderId = await withExponentialBackoff(() => createFolder('Updated', beforeFolderId));
    const updatedAfterFolderId = await withExponentialBackoff(() => createFolder('Updated', afterFolderId));
    
    let imageIds = [];
    let nextArr = [];
    for (const { buffer, originalname, mimetype, fieldname } of images) {
        const parentFolderId = fieldname === 'beforePic' ? beforeFolderId : afterFolderId;
        const stream = bufferToStream(buffer);
        const fileId = await withExponentialBackoff(() => uploadFile(stream, mimetype, parentFolderId, originalname));
        imageIds.push(fileId);
        nextArr.push({ fileId, updatedBeforeFolderId, updatedAfterFolderId, originalname, fieldname });
    }
    transformAndUploadImage(nextArr);
    return imageIds; 
}

/*This function then downloads each picture from drive
send them to sharp.js for transformation, and then
takes the stream from sharp and reuploads them
into the updated folder and a new folder*/
async function transformAndUploadImage(arr) {
    const url = 'https://pumicroservice-np3zyyh5fa-uk.a.run.app/transform-upload-images'
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageIds: arr }), 
        });
        const data = await response.json();
        console.log(data.message);
    } catch (error) {
        console.error('Error:', error);
    }

    
    // async function processItem(item) {
    //     try {
    //         const { fileId, updatedBeforeFolderId, updatedAfterFolderId, originalname, fieldname } = item;
    //         logMemoryUsage('Start downloading file');
    //         const downloadStream = await downloadFile2(fileId);
    //         if (!(downloadStream instanceof Readable)) {
    //             console.log('downloadStream is not a Stream');
    //             return; 
    //         }
    //         logMemoryUsage('Finish Downloading, now sending to sharp.js');
    
    //         const transformedStream = convertToJpgAndOptimizeSize(downloadStream);
    //         if (!(transformedStream instanceof Readable)) {
    //             console.log('transformedStream is not a Stream');
    //             return; 
    //         }
    //         logMemoryUsage('End of sharp.js transformation');
    
    //         const newFileName = `Updated-${path.parse(originalname).name}.jpg`;
    //         const updatedFolderId = fieldname === 'beforePic' ? updatedBeforeFolderId : updatedAfterFolderId;
    
    //         logMemoryUsage('Start upload to drive');
    //         const x = await pipelineAsync(
    //             transformedStream,
    //             async function (source) {
    //                 await uploadFile2(source, 'image/jpeg', updatedFolderId, newFileName);
    //             }
    //         );
    //         logMemoryUsage('End upload to drive');
    //         return 0;
    //     } catch (error) {
    //         console.error(`Error in image transformation for ${item.fileId}:`, error);
    //     }
    //     return 0;
    // }
    
    // for (const item of arr) {
    //     console.log(`Processing item: ${item.fileId}`);
    //     const x = await processItem(item);
    //     logMemoryUsage('End of processItem');
    // }
    // return 0;
}

module.exports = { processAndUploadImages, makeFirstFolder };
