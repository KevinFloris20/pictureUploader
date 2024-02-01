const Jimp = require('jimp');

/**
 * @param {Buffer} buffer - Buffer
 * @returns {Promise<Buffer>} - promise that resolves to a PNG buffer
 */
async function convertToPng(buffer) {
    try {
        const image = await Jimp.read(buffer);
        const pngBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return pngBuffer;
    } catch (error) {
        console.error('Error converting image to PNG:', error);
        throw error;
    }
}

async function getMimeType(buffer) {
    try {
        const image = await Jimp.read(buffer);
        return image.getMIME();
    } catch (error) {
        console.error('Error getting MIME type:', error);
        throw error;
    }
}

module.exports = { convertToPng, getMimeType };
