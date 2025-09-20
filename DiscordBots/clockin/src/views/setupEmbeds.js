const { EmbedBuilder } = require("discord.js");

function buildMainClockEmbed({ color = "#00FF00", guildId, targetGuildId }) {
  return new EmbedBuilder()
    .setTitle("**Start clocking in to monitor your hours**")
    .setColor(color)
    .setDescription(
      "Please be advised abusing the system such as clocking in and not doing any work is breach of contract!\n\n" +
        "• Once you Clock In you'll have a private message from the bot, please check your messages.\n\n" +
        "• Whenever taking breaks timer stops, once you are ready to work again simply click **(Continue Working)**"
    )
    .setFooter({
      text: targetGuildId && guildId === targetGuildId ? "Segritude Workforce" : undefined,
    });
}

module.exports = {
  buildMainClockEmbed,
};
