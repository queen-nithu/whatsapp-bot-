const fs = require("fs").promises;
const path = require("path");
const config = require("./config");
const connect = require("./lib/connection");
const { loadSession } = require("baileys");
const io = require("socket.io-client");
const { getandRequirePlugins } = require("./assets/database/plugins");

global.__basedir = __dirname; // Set the base directory for the project

const readAndRequireFiles = async (directory) => {
  const files = await fs.readdir(directory);
  return Promise.all(
    files
      .filter((file) => path.extname(file).toLowerCase() === ".js")
      .map((file) => require(path.join(directory, file)))
  );
};

async function initialize() {

  await readAndRequireFiles(path.join(__dirname, "/assets/database/"));
  console.log("Syncing Database");

  await config.DATABASE.sync();

  console.log("⬇  Installing Plugins...");
  await readAndRequireFiles(path.join(__dirname, "/assets/plugins/"));
  await getandRequirePlugins();
  console.log("✅ Plugins Installed!");
  const ws = io("https://socket.xasena.me/", { reconnection: true });
  ws.on("connect", () => console.log("Connected to server"));
  ws.on("disconnect", () => console.log("Disconnected from server"));
  return await connect();
}

initialize();
