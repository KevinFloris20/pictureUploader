const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const path = require('path');



/*This is sharp and its setup*/
const sharp = require('sharp');//npm i sharp@0.31.2?
sharp.cache(false);
sharp.concurrency(1);
function convertToJpgAndOptimizeSize(inputStream) {
    return inputStream.pipe(sharp().rotate().withMetadata()).jpeg({
      quality: 80,
      progressive: true,
    });
}

/*This is the google drive setup*/
const { google } = require('googleapis');
require('dotenv').config({ path: 'cred.env' });
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });


/*This function is used to upload the file to drive*/
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

/*This function is used to download the file from drive*/
async function downloadFile(fileId) {
    const response = await drive.files.get({
        fileId,
        alt: 'media',
    }, { responseType: 'stream' });
    return response.data; 
}


/*This function then downloads each picture from drive
send them to sharp.js for transformation, and then
takes the stream from sharp and reuploads them
into the updated folder and a new folder*/
const logMemoryUsage = (message) => {
    const memoryUsage = process.memoryUsage();
    console.log(`Memory Usage: RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB, External: ${Math.round(memoryUsage.external / 1024 / 1024)} MB, Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB, Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB -- ${message}`);
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
async function transformAndUploadImage(arr) {
    async function processItem(item) {
        try {
            const { fileId, updatedBeforeFolderId, updatedAfterFolderId, originalname, fieldname } = item;
            logMemoryUsage('Start downloading file')
            const downloadStream = await downloadFile(fileId);
            logMemoryUsage('Finish Downloading, now sending to sharp.js')
            const transformedStream = convertToJpgAndOptimizeSize(downloadStream);
            logMemoryUsage('End of sharp.js transformation')

            const newFileName = `Updated-${path.parse(originalname).name}.jpg`;
            const updatedFolderId = fieldname === 'beforePic' ? updatedBeforeFolderId : updatedAfterFolderId;
            logMemoryUsage('Start upload to drive')
            const newId = await withExponentialBackoff(() => uploadFile(transformedStream, 'application/octet-stream', updatedFolderId, newFileName));
            logMemoryUsage('End upload to drive')
            console.log(`Image transformation and upload successful for ${fileId} -> ${newId}`);
        } catch (error) {
            console.error(`Error in image transformation for ${item.fileId}:`, error);
        }
    }

    for (const item of arr) {
        console.log(`Processing item: ${item.fileId}`)
        await processItem(item);
        logMemoryUsage('End of processItem')
    }
}



/*This is the express app*/
app.use(bodyParser.json());

app.post('/transform-upload-images', async (req, res) => {
    const imageIds = req.body.imageIds; 
    if (!imageIds || !Array.isArray(imageIds)) {
        return res.status(400).send({ error: 'Please provide an array of image IDs.' });
    }

    try {
        await transformAndUploadImage(imageIds);
        res.send({ message: 'Images processed successfully.' });
    } catch (error) {
        console.error('Failed to process images:', error);
        res.status(500).send({ error: 'Failed to process images.' });
    }
});

app.listen(port, () => {
    console.log(`Listening at: http://localhost:${port}`);
});