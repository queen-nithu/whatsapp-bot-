const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function runTestFiles() {
 const testsDir = path.join(__dirname, 'tests');

 try {
  const files = await fs.promises.readdir(testsDir);
  const testFiles = files.filter((file) => file.endsWith('.js') && file.startsWith('test'));

  for (const file of testFiles) {
   const filePath = path.join(testsDir, file);
   console.log(`Running test file: ${filePath}`);

   exec(`node ${filePath}`, (error, stdout, stderr) => {
    if (error) {
     console.error(`Error executing ${file}: ${error.message}`);
     return;
    }
    if (stderr) {
     console.error(`stderr: ${stderr}`);
     return;
    }
    console.log(`stdout: ${stdout}`);
   });
  }
 } catch (error) {
  console.error('Error reading the tests directory:', error);
 }
}

runTestFiles();
