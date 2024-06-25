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
    },{ 
        responseType: 'stream' 
    });
    return response.data; 
}



////////fancy tech stuff below
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const FormData = require('form-data');

async function getAccessToken() {
    const auth = new GoogleAuth({
        keyFile: process.env.KEYFILEPATH,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
}

async function uploadFile2(stream, mimeType, folderId, fileName) {
    const accessToken = await getAccessToken();
    const formData = new FormData();

    formData.append('metadata', JSON.stringify({
        name: fileName,
        parents: [folderId]
    }),{
        contentType: 'application/json'
    });

    formData.append('file', stream, {
        filename: fileName,
        contentType: mimeType,
    });

    const response = await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', formData, {
        headers: {'Authorization': `Bearer ${accessToken}`, ...formData.getHeaders(),},
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });

    console.log(`Image transformation and upload successful for new file: ${response.data.id}`);
    return 0
}

async function downloadFile2(fileId) {
    const accessToken = await getAccessToken();
    const response = await axios({
        url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    return response.data;
}



module.exports = { uploadFile, createFolder, downloadFile, uploadFile2, downloadFile2};
