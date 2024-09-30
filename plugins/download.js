const { bot, Mode, getJson, postJson, toAudio, toPTT } = require('../lib');
bot(
 {
  pattern: 'spotify ?(.*)',
  fromMe: Mode,
  desc: 'Downloads Spotify Music',
  type: 'download',
 },
 async (message, match, m, client) => {
  if (!match || match.includes('spotify.com')) return await message.sendReply('*_Provide Vaild Spotify link!_*');
  const res = await getJson('https://giftedapis.us.kg/api/download/spotifydl?url=' + encodeURIComponent(match.trim()) + '&apikey=gifted');
  const msg = await message.reply('*_Downloading ' + res.data.title + '_*');
  const audio = await toAudio(res.preview);
  await msg.edit(`*_Download Success_*\n*Song Name: ${res.data.title}*\n*Duration: ${res.data.duration}*`);
  return await message.send(audio);
 }
);

