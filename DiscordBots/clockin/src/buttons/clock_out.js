const { EmbedBuilder } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");

const DM_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

module.exports = {
  id: "clock_out",
  async execute(interaction, { api }) {
    try {
      const response = await api.endShift({
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });

      const embed = createSuccessEmbed("You are now clocked out. Have a great rest of your day!").addFields({
        name: "Total worked",
        value: `${response.worker.total_worked_hours.toFixed(2)}h`,
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });

      const guildName = interaction.guild?.name || "this server";
      const dmEmbed = new EmbedBuilder()
        .setColor(DM_COLOR)
        .setTitle("Clocked out")
        .setDescription(`You're clocked out from **${guildName}**. Nice work today!`)
        .addFields({
          name: "Hours logged",
          value: `${response.worker.total_worked_hours.toFixed(2)}h total so far.`,
        });
      await notifyUserDm(interaction, { embeds: [dmEmbed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
