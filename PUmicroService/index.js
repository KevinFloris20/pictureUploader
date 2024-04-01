const express = require('express');
const app = express();
const port = process.env.PORT || 8000;
const bodyParser = require('body-parser');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream');
const util = require('util');
const pipelineAsync = util.promisify(pipeline);



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
require('dotenv').config({ path: 'cred.env' });
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

async function uploadFile(stream, mimeType, folderId, fileName) {
  const accessToken = await getAccessToken();
  const formData = new FormData();
  formData.append('metadata', JSON.stringify({
      name: fileName,
      parents: [folderId]
  }), {
      contentType: 'application/json'
  });
  formData.append('file', stream, {
      filename: fileName,
      contentType: mimeType,
  });

  const response = await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', formData, {
      headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
  });

  console.log(`Image transformation and upload successful for new file: ${response.data.id}`);
  return 0
}

async function downloadFile(fileId) {
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
            logMemoryUsage('Start downloading file');
            const downloadStream = await downloadFile(fileId);
            if (!(downloadStream instanceof Readable)) {
                console.log('downloadStream is not a Stream');
                return; 
            }
            logMemoryUsage('Finish Downloading, now sending to sharp.js');
    
            const transformedStream = convertToJpgAndOptimizeSize(downloadStream);
            if (!(transformedStream instanceof Readable)) {
                console.log('transformedStream is not a Stream');
                return; 
            }
            logMemoryUsage('End of sharp.js transformation');
    
            const newFileName = `Updated-${path.parse(originalname).name}.jpg`;
            const updatedFolderId = fieldname === 'beforePic' ? updatedBeforeFolderId : updatedAfterFolderId;
    
            logMemoryUsage('Start upload to drive');
            const x = await pipelineAsync(
                transformedStream,
                async function (source) {
                    await uploadFile(source, 'image/jpeg', updatedFolderId, newFileName);
                }
            );
            logMemoryUsage('End upload to drive');
            return 0;
        } catch (error) {
            console.error(`Error in image transformation for ${item.fileId}:`, error);
        }
        return 0;
    }
    
    for (const item of arr) {
        console.log(`Processing item: ${item.fileId}`);
        const x = await processItem(item);
        logMemoryUsage('End of processItem');
    }
    return 0;
}



/*This is the express app*/
app.use(bodyParser.json());

app.post('/transform-upload-images', async (req, res) => {
    const imageIds = req.body.imageIds; 
    if (!imageIds || !Array.isArray(imageIds)) {
        return res.status(400).send({ error: 'Please provide an array of image IDs.' });
    }

    try {
        const x = await transformAndUploadImage(imageIds);
        res.send({ message: 'Images processed successfully.' });
    } catch (error) {
        console.error('Failed to process images:', error);
        res.status(500).send({ error: 'Failed to process images.' });
    }
});

app.listen(port, () => {
    console.log(`Listening at: http://localhost:${port}`);
});