const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),
  async execute(interaction) {
    const sent = await interaction.reply({ content: "Pinging...", fetchReply: true, ephemeral: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({ content: `🏓 Pong! Latency: **${latency}ms**. Websocket: **${Math.round(interaction.client.ws.ping)}ms**.` });
  },
};
