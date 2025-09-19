const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");
const { getGuildIdFromInteraction, resolveGuildName } = require("../utils/interactions");
const { isPrivilegedMember } = require("../utils/permissions");
const { buildClockedOutView } = require("../views/dmShiftControls");

module.exports = {
  id: "clock_out",
  async execute(interaction, { api }) {
    try {
      const guildId = getGuildIdFromInteraction(interaction);
      if (!guildId) {
        await interaction.reply({
          content: "I couldn't tell which server to clock you out from. Try clocking in again first.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.inGuild()) {
        const settingsPayload = await api.getSettings({ guildId });
        const settings = settingsPayload?.settings;
        if (!isPrivilegedMember(interaction, settings)) {
          await interaction.reply({
            content: "Clock out using the red button in the DM I sent when you started your shift.",
            ephemeral: true,
          });
          return;
        }
      }

      const response = await api.endShift({
        guildId,
        userId: interaction.user.id,
      });

      const guildName = await resolveGuildName(interaction, guildId);

      if (interaction.inGuild()) {
        const embed = createSuccessEmbed("You are now clocked out. Have a great rest of your day!").addFields({
          name: "Total worked",
          value: `${response.worker.total_worked_hours.toFixed(2)}h`,
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });

        const dmView = buildClockedOutView({
          guildName,
          totalWorkedHours: response.worker.total_worked_hours,
        });
        await notifyUserDm(interaction, dmView);
      } else {
        const dmView = buildClockedOutView({
          guildName,
          totalWorkedHours: response.worker.total_worked_hours,
        });
        await interaction.update(dmView);
      }
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
