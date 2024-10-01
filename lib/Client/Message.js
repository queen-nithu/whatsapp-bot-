const Base = require('./Base');
const config = require('../../config');
const fs = require('fs');
const ReplyMessage = require('./ReplyMessage');
const fileType = require('file-type');
const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp, isUrl } = require('../Utils');
const { generateWAMessageFromContent, generateWAMessage, downloadContentFromMessage } = require('baileys');
const { tmpdir } = require('os');

class Message extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
 }

 _patch(data) {
  this.user = decodeJid(this.client.user.id);
  this.key = data.key;
  this.isGroup = data.isGroup;
  this.prefix = config.HANDLERS.replace(/[\[\]]/g, '');
  this.id = data.key.id;
  this.jid = data.key.remoteJid;
  this.chat = data.key.remoteJid;
  this.senderID = data.key.remoteJid;
  this.message = { key: data.key, message: data.message };
  this.pushName = data.pushName;
  this.sender = data.pushName;
  this.participant = parsedJid(data.sender)[0];
  try {
   this.sudo = config.SUDO.split(',').includes(this.participant.split('@')[0]);
  } catch {
   this.sudo = false;
  }
  this.text = data.body;
  this.fromMe = data.key.fromMe;
  this.isBaileys = this.id.startsWith('BAE5');
  this.timestamp = data.messageTimestamp.low || data.messageTimestamp;
  const contextInfo = data.message.extendedTextMessage?.contextInfo;
  this.mention = contextInfo?.mentionedJid || false;
  if (data.quoted) {
   if (data.message.buttonsResponseMessage) return;
   this.reply_message = new ReplyMessage(this.client, contextInfo, data);
   const quotedMessage = data.quoted.message.extendedTextMessage;
   this.reply_message.type = data.quoted.type || 'extendedTextMessage';
   this.reply_message.mtype = data.quoted.mtype;
   this.reply_message.key = data.quoted.key;
   this.reply_message.mention = quotedMessage?.contextInfo?.mentionedJid || false;
  } else {
   this.reply_message = false;
  }

  return super._patch(data);
 }

 async sendReply(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text }, { ...opt, quoted: this });
 }

 async log() {
  console.log(this.data);
 }

 async react(emoji) {
  return this.client.sendMessage(this.jid, {
   react: { text: emoji, key: this.key },
  });
 }

 async sendFile(jid, content, options = {}) {
  const { data } = await this.client.getFile(content);
  const type = (await fileType.fromBuffer(data)) || {};
  if (!type.mime) throw new Error('Unable to determine the file type.');
  return this.client.sendMessage(jid || this.jid, { [type.mime.split('/')[0]]: data }, options);
 }

 async edit(text, opt = {}) {
  await this.client.sendMessage(this.jid, { text, edit: this.key, ...opt });
 }

 async reply(text, options = {}) {
  const message = await this.client.sendMessage(this.jid, { text }, { quoted: this.data, ...options });
  return new Message(this.client, message);
 }

 async send(jid, text, opt = {}) {
  const recipient = jid.endsWith('@s.whatsapp.net') ? jid : this.jid;
  return this.client.sendMessage(recipient, { text, ...opt });
 }

 async sendFromUrl(url, options = {}) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);
  const fileInfo = await fileType.fromBuffer(buffer);
  if (!fileInfo) throw new Error('Unable to determine file type');
  const { mime } = fileInfo;
  const [mediaType] = mime.split('/');
  const messagePayload = { [mediaType]: buffer, mimetype: mime, ...options };
  return await this.client.sendMessage(this.jid, messagePayload);
 }

 async sendMessage(jid, content, opt = { packname: 'Xasena', author: 'X-electra', fileName: 'X-Asena' }, type = 'text') {
  switch (type.toLowerCase()) {
   case 'text':
    return this.client.sendMessage(jid, { text: content, ...opt });
   case 'edit':
    return await this.client.sendMessage(this.jid, { text, edit: this.key, ...opt });

   case 'image':
   case 'photo':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { image: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      image: { url: content },
      ...opt,
     });
    }
    break;

   case 'video':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { video: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      video: { url: content },
      ...opt,
     });
    }
    break;

   case 'audio':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { audio: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      audio: { url: content },
      ...opt,
     });
    }
    break;

   case 'template':
    const optional = await generateWAMessage(jid, content, opt);
    const message = {
     viewOnceMessage: {
      message: {
       ...optional.message,
      },
     },
    };
    await this.client.relayMessage(jid, message, {
     messageId: optional.key.id,
    });
    break;

   case 'interactive':
    const genMessage = createInteractiveMessage(content);
    await this.client.relayMessage(jid, genMessage.message, {
     messageId: genMessage.key.id,
    });
    break;

   case 'sticker':
    const { data, mime } = await this.client.getFile(content);
    if (mime == 'image/webp') {
     const buff = await writeExifWebp(data, opt);
     await this.client.sendMessage(jid, { sticker: { url: buff }, ...opt }, opt);
    } else {
     const mimePrefix = mime.split('/')[0];
     if (mimePrefix === 'video' || mimePrefix === 'image') {
      await this.client.sendImageAsSticker(this.jid, content, opt);
     }
    }
    break;

   case 'document':
    if (!opt.mimetype) throw new Error('Mimetype is required for document');
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { document: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      document: { url: content },
      ...opt,
     });
    }
    break;
   case 'pdf':
    if (!opt.mimetype) {
     opt.mimetype = 'application/pdf';
    }
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { document: content, ...opt });
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      document: { url: content },
      ...opt,
     });
    }
    break;

   default:
    throw new Error('Unsupported message type');
  }
 }

 async forward(jid, message, options = {}) {
  const forwardedContext = {
   contextInfo: {
    isForwarded: true,
   },
  };
  const m = generateWAMessageFromContent(jid, message, {
   ...options,
   ...forwardedContext,
   userJid: this.client.user.id,
  });

  await this.client.relayMessage(jid, m.message, {
   messageId: m.key.id,
   ...options,
  });

  return m;
 }

 async send(content, options = {}) {
  const jid = this.jid || options.jid;
  if (!jid) throw new Error('JID is required to send a message.');

  const mergedOptions = { packname: 'ғxᴏᴘ-ᴍᴅ', author: 'ᴀsᴛʀᴏ', quoted: this, ...options };

  async function detectType(content) {
   if (typeof content === 'string') return isUrl(content) ? await fetch(content, { method: 'HEAD' }).then((r) => r.headers.get('content-type')?.split('/')[0]) : 'text';
   if (Buffer.isBuffer(content)) {
    const { mime } = (await fileType.fromBuffer(content)) || {};
    return mime?.split('/')[0] || 'text';
   }
   return 'text';
  }
  const type = options.type || (await detectType(content));
  if (type === 'text') {
   return this.client.sendMessage(jid, { text: content, ...mergedOptions });
  } else if (['image', 'video', 'audio'].includes(type)) {
   return this.client.sendMessage(jid, { [type]: Buffer.isBuffer(content) ? content : { url: content }, ...mergedOptions });
  } else if (type === 'sticker') {
   const { data, mime } = await this.client.getFile(content);
   if (mime === 'image/webp') {
    const buff = await writeExifWebp(data, mergedOptions);
    return this.client.sendMessage(jid, { sticker: { url: buff }, ...mergedOptions }, mergedOptions);
   }
   return this.client.sendImageAsSticker(jid, content, mergedOptions);
  }
  throw new Error(`Unsupported message type: ${type}`);
 }
 async download() {
  if (!this.message.message) throw new Error('No message content to download');
  const messageType = Object.keys(this.message.message)[0];
  if (!['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(messageType)) {
   throw new Error('Unsupported media type');
  }
  const stream = await this.client.downloadContentFromMessage(this.message.message[messageType], messageType.split('Message')[0]);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
   buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
 }
 async PresenceUpdate(status) {
  await this.client.sendPresenceUpdate(status, this.jid);
 }

 async delete(key) {
  await this.client.sendMessage(this.jid, { delete: key });
 }

 async updateName(name) {
  await this.client.updateProfileName(name);
 }

 async getPP(jid) {
  return await this.client.profilePictureUrl(jid, 'image');
 }

 async setPP(jid, pp) {
  const profilePicture = Buffer.isBuffer(pp) ? pp : { url: pp };
  await this.client.updateProfilePicture(jid, profilePicture);
 }

 async block(jid) {
  await this.client.updateBlockStatus(jid, 'block');
 }

 async unblock(jid) {
  await this.client.updateBlockStatus(jid, 'unblock');
 }

 async add(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'add');
 }

 async kick(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'remove');
 }

 async promote(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'promote');
 }

 async demote(jid) {
  return await this.client.groupParticipantsUpdate(this.jid, jid, 'demote');
 }
}

module.exports = Message;
