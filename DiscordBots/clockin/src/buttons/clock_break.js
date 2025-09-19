const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");

module.exports = {
  id: "clock_break",
  async execute(interaction, { api }) {
    try {
      await api.startBreak({
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });

      const embed = createSuccessEmbed("Enjoy your break! Use the button when you're back.");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("clock_break_end")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Return to work"),
        new ButtonBuilder()
          .setCustomId("clock_out")
          .setStyle(ButtonStyle.Danger)
          .setLabel("Clock out")
      );

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    } catch (error) {
      const embed = createErrorEmbed(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
