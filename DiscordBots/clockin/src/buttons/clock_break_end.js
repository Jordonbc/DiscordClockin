const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");
const { getGuildIdFromInteraction, resolveGuildName } = require("../utils/interactions");
const { isPrivilegedMember } = require("../utils/permissions");
const { buildClockedInView } = require("../views/dmShiftControls");

module.exports = {
  id: "clock_break_end",
  async execute(interaction, { api }) {
    try {
      const guildId = getGuildIdFromInteraction(interaction);
      if (!guildId) {
        await interaction.reply({
          content: "I couldn't tell which server you're on the clock for. Try clocking in again.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.inGuild()) {
        const settingsPayload = await api.getSettings({ guildId });
        const settings = settingsPayload?.settings;
        if (!isPrivilegedMember(interaction, settings)) {
          await interaction.reply({
            content: "Head back to our DM and tap **Return to work** there to resume your shift.",
            ephemeral: true,
          });
          return;
        }
      }

      const response = await api.endBreak({
        guildId,
        userId: interaction.user.id,
      });

      const guildName = await resolveGuildName(interaction, guildId);

      if (interaction.inGuild()) {
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

        const dmView = buildClockedInView({
          guildName,
          guildId,
          worker: response?.worker,
        });
        await notifyUserDm(interaction, dmView);
      } else {
        const dmView = buildClockedInView({
          guildName,
          guildId,
          worker: response?.worker,
        });
        await interaction.update(dmView);
      }
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
