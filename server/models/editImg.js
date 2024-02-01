const Jimp = require('jimp');

/**
 * Converts an image from a Buffer to PNG format.
 * @param {Buffer} buffer - The buffer containing the image data.
 * @returns {Promise<Buffer>} - A promise that resolves with the PNG image buffer.
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

module.exports = { convertToPng };
