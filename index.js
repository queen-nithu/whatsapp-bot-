const fs = require("fs").promises;
const path = require("path");
const config = require("./config");
const { connect, getandRequirePlugins } = require("./lib");
global.__basedir = __dirname;

const readAndRequireFiles = async (directory) => {
  const files = await fs.readdir(directory);
  return (await Promise.all(
    files
      .filter(file => path.extname(file).toLowerCase() === '.js')
      .map(async file => {
        try {
          return require(path.join(directory, file));
        } catch (error) {
          console.error(`Error in file ${file}:${error.lineNumber || ''} - Skipping`);
          return null;
        }
      })
  )).filter(Boolean);
};

async function initialize() {

  await readAndRequireFiles(path.join(__dirname, "/lib/Store/"));
  console.log("Syncing Database");
  await config.DATABASE.sync();
  console.log("⬇  Installing Plugins...");
  await readAndRequireFiles(path.join(__dirname, "/plugins/"));
  await getandRequirePlugins();
  console.log("✅ Plugins Installed!");
  return await connect();
}

initialize();
