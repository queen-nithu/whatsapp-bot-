const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path')
// Set the ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegPath);

// Example: Convert an audio buffer to mp3 format
const convertToMp3 = (inputPath, outputPath) => {
 return new Promise((resolve, reject) => {
  ffmpeg(inputPath)
   .output(outputPath)
   .audioBitrate(128)
   .on('end', () => resolve('Conversion complete'))
   .on('error', (err) => reject(err))
   .run();
 });
};
const viddir = path.join(__dirname, 'video.mp4')
convertToMp3(viddir, 'output.mp3')
 .then((msg) => console.log(msg))
 .catch((err) => console.error(err));
