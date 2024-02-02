const sharp = require('sharp');//npm i sharp@0.30.7

async function convertToPng(buffer) {
    try {
        const pngBuffer = await sharp(buffer)
            .rotate()
            .withMetadata()
            .png({
                quality: 40, //between 0-100
                compressionLevel: 9, //compression level from 0 (fastest) to 9 (smallest)
                progressive: true //progressive scanning
            })
            .toBuffer();
        console.log(pngBuffer);
        return pngBuffer;
    } catch (error) {
        console.error('Error converting image to PNG:', error);
        throw error;
    }
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

module.exports = { convertToPng, getMimeType };













// const Jimp = require('jimp');

// async function convertToPng(buffer) {
//     try {
//         const image = await Jimp.read(buffer);
//         const pngBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
//         return pngBuffer;
//     } catch (error) {
//         console.error('Error converting image to PNG:', error);
//         throw error;
//     }
// }

// async function getMimeType(buffer) {
//     try {
//         const image = await Jimp.read(buffer);
//         return image.getMIME();
//     } catch (error) {
//         console.error('Error getting MIME type:', error);
//         throw error;
//     }
// }

// module.exports = { convertToPng, getMimeType };
