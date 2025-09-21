const { EmbedBuilder } = require("discord.js");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#81e6ff";

function buildMainClockEmbed({ color = DEFAULT_COLOR, guildId, targetGuildId }) {
  const embed = new EmbedBuilder()
    .setTitle("**Start clocking in to monitor your hours**")
    .setColor(color)
    .setDescription(
      "Please be advised abusing the system such as clocking in and not doing any work is breach of contract!\n\n" +
        "• Once you Clock In you'll have a private message from the bot, please check your messages.\n\n" +
        "• Whenever taking breaks timer stops, once you are ready to work again simply click **(Continue Working)**"
    );

  if (targetGuildId && guildId === targetGuildId) {
    embed.setFooter({ text: "Segritude Workforce" });
  }

  return embed;
}

module.exports = {
  buildMainClockEmbed,
};
