const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const botJSON = require("../../package.json");

module.exports = {
  name: "ping",
  description: "» Shows you the bot ping",
  cooldown: 3000,
  category: "Information",
  type: ApplicationCommandType.ChatInput,
  options: [],
  run: async (client, interaction) => {
    const ping = Date.now() - interaction.createdTimestamp;
    interaction.reply({
      content: `Pong! The bot latency is \`${ping}ms\`. 🏓`,
      ephemeral: true,
    });
  },
};
