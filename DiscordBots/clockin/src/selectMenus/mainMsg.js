const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { showRegistrationFlow } = require("../workflows/registerWorker");
const { showBalance } = require("../workflows/showBalance");
const { requestTimeOffModal } = require("../workflows/timeOff");
const { emergencyLeaveHandler } = require("../workflows/emergency");
const { submitIssueModal, submitSuggestionModal } = require("../workflows/support");

module.exports = {
  id: "mainMsg_selectMenu",
  async execute(interaction, context) {
    const choice = interaction.values[0];

    switch (choice) {
      case "clockin":
        await handleClockIn(interaction, context);
        break;
      case "register":
        await showRegistrationFlow(interaction, context);
        break;
      case "timeoff":
        await requestTimeOffModal(interaction, context);
        break;
      case "emergency":
        await emergencyLeaveHandler(interaction, context);
        break;
      case "balance":
        await showBalance(interaction, context);
        break;
      case "contacthr":
        await handleContactHr(interaction);
        break;
      case "issue":
        await submitIssueModal(interaction, context);
        break;
      case "suggestion":
        await submitSuggestionModal(interaction, context);
        break;
      default:
        await interaction.reply({
          content: "Unsupported option selected.",
          ephemeral: true,
        });
    }
  },
};

async function handleClockIn(interaction, { api }) {
  try {
    await api.startShift({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      clockInMessageId: interaction.message.id,
    });

    const embed = createSuccessEmbed("You are now clocked in. Have a productive session!");
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
  } catch (error) {
    const embed = createErrorEmbed(error);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleContactHr(interaction) {
  await interaction.reply({
    content: "Please open a ticket or reach out to the HR team directly in the HR channel.",
    ephemeral: true,
  });
}
