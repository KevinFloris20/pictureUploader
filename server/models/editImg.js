const sharp = require('sharp');//npm i sharp@0.31.2?
sharp.cache(false);
sharp.concurrency(1);

function convertToJpgAndOptimizeSize(inputStream) {
    return inputStream.pipe(sharp().rotate().withMetadata()).jpeg({
      quality: 80,
      progressive: true,
    });
}

async function getMimeType(buffer) {
    try {
        const metadata = await sharp(buffer).metadata();
        const format = metadata.format;

        let mimeType;
        switch (format) {
            case 'jpeg':
                mimeType = 'image/jpeg';
                break;
            case 'png':
                mimeType = 'image/png';
                break;
            case 'webp':
                mimeType = 'image/webp';
                break;
            case 'gif':
                mimeType = 'image/gif';
                break;
            case 'tiff':
                mimeType = 'image/tiff';
                break;
            default:
                mimeType = 'application/octet-stream'; 
        }
        return mimeType;
    } catch (error) {
        console.error('Error getting image format:', error);
        throw error;
    }
}

module.exports = { convertToJpgAndOptimizeSize, getMimeType };







