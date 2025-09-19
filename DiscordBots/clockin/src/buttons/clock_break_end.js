const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");

const DM_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

module.exports = {
  id: "clock_break_end",
  async execute(interaction, { api }) {
    try {
      await api.endBreak({
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });

      const embed = createSuccessEmbed("Welcome back! You're now clocked in.");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("clock_break")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Take a break"),
        new ButtonBuilder()
          .setCustomId("clock_out")
          .setStyle(ButtonStyle.Danger)
          .setLabel("Clock out")
      );

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

      const guildName = interaction.guild?.name || "this server";
      const dmEmbed = new EmbedBuilder()
        .setColor(DM_COLOR)
        .setTitle("Break ended")
        .setDescription(`You're back to work in **${guildName}**. I'll keep timing your shift.`);
      await notifyUserDm(interaction, { embeds: [dmEmbed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
