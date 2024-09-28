const fs = require("fs").promises;
const path = require("path");
const config = require("./config");
const connect = require("./lib/connect");
const { getandRequirePlugins } = require("./lib/Store/plugins");

global.__basedir = __dirname;

const readAndRequireFiles = async (directory) => {
  const files = await fs.readdir(directory);
  return Promise.all(
    files
      .filter((file) => path.extname(file).toLowerCase() === ".js")
      .map((file) => require(path.join(directory, file)))
  );
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
