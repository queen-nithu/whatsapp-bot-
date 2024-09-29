const { bot, Mode } = require("../lib");
bot(
  {
    pattern: "ping",
    fromMe: Mode,
    desc: "To check ping",
    type: "user",
  },
  async (message, match) => {
    const start = new Date().getTime();
    await message.sendMessage(message.jid, "```Ping!```");
    const end = new Date().getTime();
    return await message.sendMessage(
      message.jid,
      "*Pong!*\n ```" + (end - start) + "``` *ms*"
    );
  }
);

