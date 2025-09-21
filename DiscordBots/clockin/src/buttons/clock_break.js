const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");
const { getGuildIdFromInteraction, resolveGuildName } = require("../utils/interactions");
const { isPrivilegedMember } = require("../utils/permissions");
const { buildOnBreakView } = require("../views/dmShiftControls");
const { triggerAvailabilityRefresh } = require("../utils/availabilitySnapshots");

module.exports = {
  id: "clock_break",
  async execute(interaction, { api }) {
    try {
      const guildId = getGuildIdFromInteraction(interaction);
      if (!guildId) {
        await interaction.reply({
          content: "I couldn't tell which server you're working in. Try clocking in again.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.inGuild()) {
        const settingsPayload = await api.getSettings({ guildId });
        const settings = settingsPayload?.settings;
        if (!isPrivilegedMember(interaction, settings)) {
          await interaction.reply({
            content: "Use the break button in the private DM I sent when you clocked in.",
            ephemeral: true,
          });
          return;
        }
      }

      const response = await api.startBreak({
        guildId,
        userId: interaction.user.id,
      });

      const guildName = await resolveGuildName(interaction, guildId);

      if (interaction.inGuild()) {
        const embed = createSuccessEmbed("Enjoy your break! I've updated your DM controls.");
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

        const dmView = buildOnBreakView({
          guildName,
          guildId,
          worker: response?.worker,
        });
        await notifyUserDm(interaction, dmView);
        await triggerAvailabilityRefresh({ client: interaction.client, guildId });
      } else {
        const dmView = buildOnBreakView({
          guildName,
          guildId,
          worker: response?.worker,
        });
        await interaction.update(dmView);
        await triggerAvailabilityRefresh({ client: interaction.client, guildId });
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
