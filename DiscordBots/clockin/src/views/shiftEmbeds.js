const { EmbedBuilder } = require("discord.js");

function buildShiftEmbed(title, worker) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`Status: **${worker.status}**`)
    .addFields(
      { name: "Breaks taken", value: `${worker.breaks_count}`, inline: true },
      {
        name: "Break hours",
        value: worker.break_time_hours.toFixed(2),
        inline: true,
      },
      {
        name: "Total worked hours",
        value: worker.total_worked_hours.toFixed(2),
        inline: true,
      }
    )
    .setTimestamp(new Date());
}

module.exports = {
  buildShiftEmbed,
};
