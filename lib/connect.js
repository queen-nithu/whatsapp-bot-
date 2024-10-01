const pino = require('pino');
const path = require('path');
const fs = require('fs').promises;
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const { PausedChats } = require('./Store');
const config = require('../config');
const { serialize } = require('./serialize');
const { Greetings, sessionID } = require('./Utils');
const { Image, Message, Sticker, Video, AllMessage } = require('./Client');
const { loadMessage, saveMessage, saveChat, getName } = require('./Store').Store;
const plugins = require('./Utils');
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
const connect = async () => {
 const sessionDir = path.join(__dirname, '../auth');
 await fs.mkdir(sessionDir, { recursive: true });
 await sessionID();
 const { version, isLatest } = await fetchLatestBaileysVersion();
 const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
 console.log(`Version: ${version.join('.')}\nisLatest:${isLatest}`);
 const conn = makeWASocket({
  version,
  auth: {
   creds: state.creds,
   keys: makeCacheableSignalKeyStore(state.keys, logger),
  },
  printQRInTerminal: false,
  logger: logger.child({ module: 'baileys' }),
  browser: Browsers.ubuntu('Chrome'),
  downloadHistory: true,
  syncFullHistory: true,
  markOnlineOnConnect: true,
  emitOwnEvents: true,
  generateHighQualityLinkPreview: true,
  getMessage: async (key) => ((await loadMessage(key.id)) || {}).message || { conversation: null },
 });

 const handleConnection = async ({ connection, lastDisconnect }) => {
  if (connection === 'open') {
   console.log('Connected\n');
   const packageVersion = require('../package.json').version;
   const aliveMsg = `FXOPRISA ${packageVersion}\nPREFIX: ${config.HANDLERS}\nPLUGINS: ${plugins.commands.length}\nMODE: ${config.WORK_TYPE}`;
   const imageBuffer = await fs.readFile(path.join(__dirname, './Streams/images/thumb.jpg'));
   (await conn.sendMessage(conn.user.id, { image: imageBuffer, caption: '```' + aliveMsg + '```', contextInfo: { forwardingScore: 2, isForwarded: true } })) && console.log(aliveMsg);
  } else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
   await delay(10000);
   connect();
  }
 };

 const handleMessages = async ({ messages }) => {
  const msg = await serialize(JSON.parse(JSON.stringify(messages[0])), conn);
  await saveMessage(messages[0], msg.sender);
  if (config.AUTO_READ) await conn.readMessages([msg.key]);
  if (config.AUTO_STATUS_READ && msg.from === 'status@broadcast') await conn.readMessages([msg.key]);

  const isResume = new RegExp(`${config.HANDLERS}( ?resume)`, 'is').test(msg.body);
  const pausedChats = await PausedChats.getPausedChats();
  if (pausedChats.some((chat) => chat.chatId === msg.from && !isResume)) return;

  if (config.LOGS) await logMessage(msg, conn);

  for (const command of plugins.commands) {
   if (command.fromMe && msg.devs && !msg.sudo) continue;

   const executeCommand = (Instance, args) => {
    const whats = new Instance(conn, msg);
    command.function(whats, ...args, msg, conn, messages[0]);
   };

   if (msg.body && command.pattern) {
    const match = msg.body.match(command.pattern);
    if (match) {
     msg.prefix = match[1];
     msg.command = [match[1], match[2]].join('');
     executeCommand(Message, [match[3] || false]);
     break;
    }
   } else if (command.on) {
    const commandHandlers = {
     text: () => msg.body && executeCommand(Message, [msg.body]),
     image: () => msg.type === 'imageMessage' && executeCommand(Image, [msg.body]),
     sticker: () => msg.type === 'stickerMessage' && executeCommand(Sticker, []),
     video: () => msg.type === 'videoMessage' && executeCommand(Video, []),
     delete: () => {
      if (msg.type === 'protocolMessage') {
       const whats = new Message(conn, msg);
       whats.messageId = msg.message.protocolMessage.key?.id;
       command.function(whats, msg, conn, messages[0]);
      }
     },
     message: () => executeCommand(AllMessage, []),
    };
    commandHandlers[command.on]?.();
   }
  }
 };

 conn.ev.on('connection.update', handleConnection);
 conn.ev.on('creds.update', saveCreds);
 conn.ev.on('group-participants.update', (data) => Greetings(data, conn));
 conn.ev.on('chats.update', (chats) => Promise.all(chats.map(saveChat)));
 conn.ev.on('messages.upsert', handleMessages);

 process.on('unhandledRejection', (err) => handleErrors(err, conn));
 process.on('uncaughtException', (err) => handleErrors(err, conn));

 return conn;
};

const handleErrors = async (err, conn) => {
 const { message, stack } = err;
 const fileName = stack?.split('\n')[1]?.trim();
 const errorText = `\`\`\`─━❲ ERROR REPORT ❳━─\nMessage: ${message}\nFrom: ${fileName}\`\`\``;
 await conn.sendMessage(conn.user.id, { text: errorText });
 console.error(message, fileName);
};

const logMessage = async (msg, conn) => {
 const botId = conn.user.id;
 if (msg.sender === botId) return;
 const name = await getName(msg.sender);
 const chatInfo = msg.from?.endsWith('@g.us') ? (await conn.groupMetadata(msg.from))?.subject : msg.from;
 if (name && chatInfo && (msg.body || msg.type)) {
  console.log(`${chatInfo}\n${name}: ${msg.body || msg.type}`);
 }
};
module.exports = { connect };
