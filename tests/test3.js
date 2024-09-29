const fs = require('fs');
const PDFDocument = require('pdfkit'); // Ensure you have pdfkit installed
const path = require('path');

// The convertToPDF function from your code
function convertToPDF(input, inputType = 'text') {
 return new Promise((resolve, reject) => {
  const chunks = [];
  const doc = new PDFDocument();

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => {
   const pdfBuffer = Buffer.concat(chunks);
   resolve(pdfBuffer);
  });

  switch (inputType) {
   case 'text':
    doc.fontSize(12).text(input, 100, 100);
    break;
   case 'image':
    if (typeof input === 'string' || Buffer.isBuffer(input)) {
     doc.image(input, {
      fit: [250, 300],
      align: 'center',
      valign: 'center',
     });
    } else {
     reject(new Error('Invalid image input. Must be a file path or a buffer.'));
     return;
    }
    break;
   default:
    reject(new Error('Invalid input type. Use "text" or "image".'));
    return;
  }

  doc.end();
 });
}

async function convertInputToPDF(input, inputType) {
 if (inputType === 'text') {
  if (typeof input !== 'string' && !Buffer.isBuffer(input)) {
   throw new Error('Invalid text input. Must be a string or a buffer.');
  }
  const processedTextInput = typeof input === 'string' ? input : input.toString();
  return await convertToPDF(processedTextInput, 'text');
 } else if (inputType === 'image') {
  let processedImageInput;
  if (typeof input === 'string' && fs.existsSync(input)) {
   processedImageInput = fs.readFileSync(input); // Read file if it's an image path
  } else if (Buffer.isBuffer(input)) {
   processedImageInput = input;
  } else {
   throw new Error('Invalid image input. Must be a valid file path or a buffer.');
  }
  return await convertToPDF(processedImageInput, 'image');
 } else {
  throw new Error('Invalid input type. Use "text" or "image".');
 }
}

async function testConversion() {
 try {
  const textInput = 'This is the text content for the PDF.';
  const finalPdfBufferFromText = await convertInputToPDF(textInput, 'text');
  fs.writeFileSync('output_text.pdf', finalPdfBufferFromText);
  console.log('PDF created successfully from text!');

  const imageInput = path.join(__dirname, 'image.png'); // Update this path to your image file
  const finalPdfBufferFromImage = await convertInputToPDF(imageInput, 'image');
  fs.writeFileSync('output_image.pdf', finalPdfBufferFromImage);
  console.log('PDF created successfully from image!');
 } catch (error) {
  console.error('Error:', error.message);
 }
}

// Call the test function
testConversion();
