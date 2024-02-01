const { google } = require('googleapis');
const { Readable } = require('stream'); 
require('dotenv').config({ path: 'cred.env' });

const KEYFILEPATH = process.env.KEYFILEPATH; 

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({
  version: 'v3',
  auth
});

async function uploadFile(buffer, mimeType, folderId, fileName) {
  try {
    const stream = new Readable();//this makes the buffer into a stream
    stream.push(buffer);
    stream.push(null); 

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType,
      },
      media: {
        mimeType,
        body: stream, 
      },
    });
    return response.data.id;
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
}

async function createFolder(name, parentFolderId = null) {
  try {
    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : [],
    };
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    return response.data.id;
  } catch (error) {
    console.error('Error creating folder:', error.message);
    throw error;
  }
}

module.exports = { uploadFile, createFolder };
