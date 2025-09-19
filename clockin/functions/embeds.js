const { EmbedBuilder } = require("discord.js");

function planRequired(plan) {
  const embed = new EmbedBuilder()
    .setColor("Red")
    .setDescription(`You need the \`${plan}\` subscription to do that.`);

  return embed;
}

module.exports = { planRequired };
