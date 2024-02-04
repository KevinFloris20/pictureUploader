const { google } = require('googleapis');
require('dotenv').config({ path: 'cred.env' });

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function uploadFile(stream, mimeType, folderId, fileName) {
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
}

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

module.exports = { uploadFile, createFolder, downloadFile };
