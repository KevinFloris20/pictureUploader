const path = require('path');
const { uploadFile, createFolder, convertToPng } = require('./googleDriveService');

const MAIN_FOLDER_ID = '1wlKANogfrk5cTnpCEAlX-mpMU26VQ5m0'; 

async function processAndUploadImages(equipmentId, images) {
  try {
    const equipmentFolderId = await createFolder(equipmentId, MAIN_FOLDER_ID);

    for (const image of images) {
      const pngBuffer = await convertToPng(image.buffer);
      const newFileName = `${path.parse(image.originalname).name}.png`;
      await uploadFile(pngBuffer, 'image/png', equipmentFolderId, newFileName);
    }

    console.log(`All images processed and uploaded for equipment ID: ${equipmentId}`);
  } catch (error) {
    console.error('Error during image processing and uploading:', error);
    throw error;
  }
}

module.exports = { processAndUploadImages };


