const { google } = require('googleapis');
require('dotenv').config({ path: 'cred.env' });


const auth = new google.auth.GoogleAuth({
    keyFile: process.env.KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function uploadFile(stream, mimeType, folderId, fileName) {
    let response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
            mimeType,
        },
        media: {
            mimeType,
            body: stream,
        },
        fields: 'id',
    });
    const id = response.data.id;
    response = null;
    stream.destroy();
    return id
}
// async function uploadFile2(stream, mimeType, folderId, fileName) {
//     try {
//       const response = await drive.files.create({
//         requestBody: {
//           name: fileName,
//           parents: [folderId],
//           mimeType,
//         },
//         media: {
//           mimeType,
//           body: stream, 
//         },
//         fields: 'id',
//       });
//       return response.data.id;
//     } catch (error) {
//       console.error("Error uploading file:", error);
//       stream.destroy();
//       throw error;
//     } finally {
//       stream.destroy();
//       stream = null;
//     }
//   }
  


async function createFolder(name, parentFolderId = null) {
    const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : [],
    };
    const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });
    return response.data.id;
}

async function downloadFile(fileId) {
    const response = await drive.files.get({
        fileId,
        alt: 'media',
    }, { responseType: 'stream' });
    return response.data; 
}



////////fancy tech stuff below
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Function to obtain access token using GoogleAuth library
async function getAccessToken() {
    const auth = new GoogleAuth({
        keyFile: 'path/to/your/service-account-file.json',
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
}

// Function to upload file to Google Drive
async function uploadFile2(filePath, mimeType, folderId, fileName) {
    const accessToken = await getAccessToken();
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify({
        name: fileName,
        parents: [folderId],
    })], { type: 'application/json' }));
    formData.append('file', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: mimeType,
    });

    const response = await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', formData, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...formData.getHeaders(),
        },
    });

    return response.data; 
}

async function downloadFile2(fileId, destinationPath) {
  const accessToken = await getAccessToken();
  const response = await axios({
      url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      method: 'GET',
      responseType: 'stream',
      headers: {
          'Authorization': `Bearer ${accessToken}`,
      },
  });

  return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destinationPath);
      response.data.pipe(writer);
      writer.on('error', reject);
      writer.on('finish', resolve);
  });
}


module.exports = { uploadFile, createFolder, downloadFile, uploadFile2, downloadFile2};
