const path = require('path');
const { uploadFile, createFolder, downloadFile } = require('./googleDriveService');
const { convertToJpgAndOptimizeSize } = require('./editImg');

const MAIN_FOLDER_ID = '1wlKANogfrk5cTnpCEAlX-mpMU26VQ5m0';

async function withExponentialBackoff(operation, maxRetries = 5) {
    let retryCount = 0;
    let delay = 1000;

    while (retryCount < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            if (retryCount === maxRetries - 1) {
                throw error;
            }
            console.error(`Operation failed, retrying in ${delay}ms...`, error);
            await new Promise((resolve) => setTimeout(resolve, delay));
            retryCount++;
            delay *= 2;
        }
    }
}

class TransformationQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift(); 
            try {
                await task();
            } catch (error) {
                console.error('Error processing image transformation:', error);
            }
        }
        this.processing = false;
    }

    addTask(task) {
        this.queue.push(task);
        this.processQueue(); 
    }
}
const transformationQueue = new TransformationQueue();

async function transformImgs(images, updatedBeforeFolderId, updatedAfterFolderId) {
    for (const image of images) {
        transformationQueue.addTask(async () => {
            const buffer = await withExponentialBackoff(() => downloadFile(image.fileId));
            const jpgBuffer = await convertToJpgAndOptimizeSize(buffer);
            const newFileName = `${path.parse(image.originalname).name}.jpg`;
            const folderId = image.fieldname === 'beforePic' ? updatedBeforeFolderId : updatedAfterFolderId;
            
            await withExponentialBackoff(() => uploadFile(jpgBuffer, 'image/jpeg', folderId, newFileName));
        });
    }
}

async function processAndUploadImages(equipmentId, images) {
    try {
        const equipmentFolderId = await withExponentialBackoff(() => createFolder(equipmentId, MAIN_FOLDER_ID));
        const beforeFolderId = await withExponentialBackoff(() => createFolder('Before', equipmentFolderId));
        const afterFolderId = await withExponentialBackoff(() => createFolder('After', equipmentFolderId));
        const updatedBeforeFolderId = await withExponentialBackoff(() => createFolder('Updated', beforeFolderId));
        const updatedAfterFolderId = await withExponentialBackoff(() => createFolder('Updated', afterFolderId));

        let imageDetails = [];
        for (const image of images) {
            const buffer = image.buffer;
            const newFileName = image.originalname;
            const folderId = image.fieldname === 'beforePic' ? beforeFolderId : afterFolderId;
            const fileId = await withExponentialBackoff(() => uploadFile(buffer, image.mimetype, folderId, newFileName));
            imageDetails.push({ fileId, originalname: newFileName, fieldname: image.fieldname });
        }

        transformImgs(imageDetails, updatedBeforeFolderId, updatedAfterFolderId);
        console.log(`All original images processed and uploaded for equipment ID: ${equipmentId}`);
    } catch (error) {
        console.error('Error during image processing and uploading:', error);
        throw error;
    }
}

module.exports = { processAndUploadImages };
