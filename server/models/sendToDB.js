// sendToDB.js
const path = require('path');
const { uploadFile, createFolder, convertToPng } = require('./googleDriveService');

const MAIN_FOLDER_ID = '1wlKANogfrk5cTnpCEAlX-mpMU26VQ5m0'; // Replace with your "main" folder ID

async function processAndUploadImages(equipmentId, images) {
  try {
    // Create a new folder for the equipment ID inside the main folder
    const equipmentFolderId = await createFolder(equipmentId, MAIN_FOLDER_ID);

    for (const image of images) {
      // Convert image buffer to PNG
      const pngBuffer = await convertToPng(image.buffer);

      // Create a new file name with .png extension
      const newFileName = `${path.parse(image.originalname).name}.png`;

      // Upload the PNG buffer to Google Drive
      await uploadFile(pngBuffer, 'image/png', equipmentFolderId, newFileName);
    }

    console.log(`All images processed and uploaded for equipment ID: ${equipmentId}`);
  } catch (error) {
    console.error('Error during image processing and uploading:', error);
    throw error;
  }
}

module.exports = { processAndUploadImages };


// createFolder('testFolder', MAIN_FOLDER_ID).then(folderId => {
//     console.log('Folder ID:', folderId);
// }).catch(error => {
//     console.error('Error creating folder:', error.message);
// });

// async function createFolderAndUploadFile() {
//     try {
//         // Step 1: Create the 'testFolder'
//         const testFolderId = await createFolder('testFolder', MAIN_FOLDER_ID);
//         console.log(`'testFolder' created with ID: ${testFolderId}`);


//         const filePath = './gatto33.jpg'; 
//         const mimeType = 'image/jpeg'; 
//         const uploadedFileId = await uploadFile(filePath, mimeType, testFolderId);
//         console.log(`File uploaded with ID: ${uploadedFileId}`);
//     } catch (error) {
//         console.error('Error:', error.message);
//     }
// }

// createFolderAndUploadFile();

// module.exports = { uploadFile, createFolder };