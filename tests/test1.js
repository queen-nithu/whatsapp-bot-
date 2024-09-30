const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
/**
 * Converts an image (path or buffer) to WebP format.
 * @param {string|Buffer} input - Path to the image or image buffer.
 * @param {string} [outputPath] - Optional path to save the converted WebP image.
 * @returns {Promise<Buffer>} - The WebP buffer.
 */
async function convertToWebP(input, outputPath = null) {
 let image = typeof input === 'string' ? sharp(input) : sharp(input);
 const webpBuffer = await image.toFormat('webp').toBuffer();
 if (outputPath) fs.writeFileSync(outputPath, webpBuffer);
 return webpBuffer;
}

// Usage Example:

const imginput = path.join(__dirname, 'image.png');
convertToWebP(imginput, 'output_image.webp').then(() => {
 console.log('Conversion from file path successful!');
});
