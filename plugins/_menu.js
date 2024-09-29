const os = require('os');
const plugins = require('../lib/Utils');
const { bot, Mode, runtime, commands } = require('../lib');
const { TIME_ZONE } = require('../config');

function getRAMUsage() {
 const totalMemory = os.totalmem();
 const freeMemory = os.freemem();
 const usedMemory = totalMemory - freeMemory;
 return `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB / ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getOS() {
 const osType = os.type();
 switch (osType) {
  case 'Linux':
   return 'Linux';
  case 'Darwin':
   return 'MacOS';
  case 'Windows_NT':
   return 'Windows';
  default:
   return 'VPS';
 }
}

bot(
 {
  pattern: 'menu',
  fromMe: Mode,
  description: 'Show All Commands',
  dontAddCommandList: true,
 },
 async (message) => {
  const { prefix, pushName, jid } = message;
  const currentTime = new Date().toLocaleTimeString('en-IN', { timeZone: TIME_ZONE });
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: TIME_ZONE });
  let menuText = `╭─ ғxᴏᴘʀɪsᴀ ᴍᴅ ───
│ Prefix: ${prefix}
│ User: ${pushName}
│ Os: ${getOS()}
│ Plugins: ${commands.length}
│ Runtime: ${runtime(process.uptime())}
│ Ram: ${getRAMUsage()}
│ Time: ${currentTime}
│ Day: ${currentDay}
│ Date: ${currentDate}
│ Version: ${require('../package.json').version}
╰────────────────\n`;

  const categorized = commands
   .filter((cmd) => cmd.pattern && !cmd.dontAddCommandList)
   .map((cmd) => ({
    name: cmd.pattern.toString().split(/\W+/)[2],
    category: cmd.type?.toLowerCase() || 'misc',
   }))
   .reduce((acc, { name, category }) => {
    acc[category] = (acc[category] || []).concat(name);
    return acc;
   }, {});

  Object.keys(categorized)
   .sort()
   .forEach((category) => {
    menuText += `\n╭── ${category} ────\n│ ${categorized[category].sort().join('\n│ ')}\n╰──────────────\n`;
   });

  return await message.sendMessage(jid, '```' + menuText.trim() + '```');
 }
);

bot(
 {
  pattern: 'list',
  fromMe: Mode,
  desc: 'Show All Commands',
  dontAddCommandList: true,
 },
 async (message, match, { prefix }) => {
  let menu = '\t\t```Command List```\n';

  let cmnd = [];
  let cmd, desc;
  plugins.commands.map((command) => {
   if (command.pattern) {
    cmd = command.pattern.toString().split(/\W+/)[1];
   }
   desc = command.desc || false;

   if (!command.dontAddCommandList && cmd !== undefined) {
    cmnd.push({ cmd, desc });
   }
  });
  cmnd.sort();
  cmnd.forEach(({ cmd, desc }, num) => {
   menu += `\`\`\`${(num += 1)} ${cmd.trim()}\`\`\`\n`;
   if (desc) menu += `Use: \`\`\`${desc}\`\`\`\n\n`;
  });
  menu += ``;
  return await message.reply(menu);
 }
);
