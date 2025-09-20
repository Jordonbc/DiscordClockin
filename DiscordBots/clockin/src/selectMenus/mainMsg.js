const { EmbedBuilder } = require("discord.js");
const { createErrorEmbed, applyInteractionBranding } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");
const { showRegistrationFlow } = require("../workflows/registerWorker");
const { showBalance } = require("../workflows/showBalance");
const { requestTimeOffModal } = require("../workflows/timeOff");
const { emergencyLeaveHandler } = require("../workflows/emergency");
const { submitIssueModal, submitSuggestionModal } = require("../workflows/support");
const { buildClockedInView } = require("../views/dmShiftControls");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

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

    await interaction.reply({
      content: "✅ You're clocked in. Check your DMs for the private controls.",
      ephemeral: true,
    });

    const guildName = interaction.guild?.name || "this server";
    const dmView = buildClockedInView({
      guildName,
      guildId: interaction.guildId,
    });

    await notifyUserDm(interaction, dmView);
  } catch (error) {
    const embed = createErrorEmbed(error);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleContactHr(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("Contact HR")
    .setDescription("Need help from a person? Here's how to reach the HR team.")
    .addFields(
      {
        name: "Open a ticket",
        value: "Use the HR ticket channel to start a private thread with the team.",
      },
      {
        name: "Direct message",
        value: "If it's urgent, DM an HR representative so they can follow up quickly.",
      },
      {
        name: "Availability",
        value: "HR is online during business hours and will respond as soon as possible.",
      }
    );

  applyInteractionBranding(embed, interaction, {
    accentEmoji: "👥",
    color: DEFAULT_COLOR,
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
