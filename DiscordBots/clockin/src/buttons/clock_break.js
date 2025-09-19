const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");

const DM_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

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

      const guildName = interaction.guild?.name || "this server";
      const dmEmbed = new EmbedBuilder()
        .setColor(DM_COLOR)
        .setTitle("Break started")
        .setDescription(
          `I'm tracking your break for **${guildName}**. I'll nudge you here when it's time to head back.`
        )
        .addFields({
          name: "Resume work",
          value: "Return to the server and tap **Return to work** or run `/clock break end` when you're ready.",
        });
      await notifyUserDm(interaction, { embeds: [dmEmbed] });
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
