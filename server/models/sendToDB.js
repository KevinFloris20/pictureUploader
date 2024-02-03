const path = require('path');
const { uploadFile, createFolder } = require('./googleDriveService');
const { convertToJpgAndOptimizeSize } = require('./editImg');

const MAIN_FOLDER_ID = '1wlKANogfrk5cTnpCEAlX-mpMU26VQ5m0'; 

async function transformImgs(images, beforeFolderId, afterFolderId) {
    try {
        for (const image of images) {
            const jpgBuffer = await convertToJpgAndOptimizeSize(image.buffer);
            const newFileName = `${path.parse(image.originalname).name}.jpg`; 
            const folderId = image.fieldname === 'beforePic' ? beforeFolderId : afterFolderId;
            
            await uploadFile(jpgBuffer, 'image/jpeg', folderId, newFileName);
        }
        console.log('All images transformed and uploaded');
    } catch (error) {
        console.error('Error during image transformation:', error);
    }
}

async function processAndUploadImages(equipmentId, images) {
  try {
    const equipmentFolderId = await createFolder(equipmentId, MAIN_FOLDER_ID);
    const beforeFolderId = await createFolder('Before', equipmentFolderId);
    const afterFolderId = await createFolder('After', equipmentFolderId);
    const originalbeforeFolderId = await createFolder('Original', beforeFolderId);
    const originalafterFolderId = await createFolder('Original', afterFolderId);
    for (const image of images) {
        const buffer = image.buffer;
        const newFileName = image.originalname;
        const folderId = image.fieldname === 'beforePic' ? originalbeforeFolderId : originalafterFolderId;
        await uploadFile(buffer, image.mimetype, folderId, newFileName);
    }
    transformImgs(images, beforeFolderId, afterFolderId);
    console.log(`All original images processed and uploaded for equipment ID: ${equipmentId}`);
    return;
  } catch (error) {
    console.error('Error during image processing and uploading:', error);
    throw error;
  }
}

module.exports = { processAndUploadImages };


