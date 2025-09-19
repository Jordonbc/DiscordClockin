const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { createErrorEmbed, createSuccessEmbed, applyInteractionBranding } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");
const { showRegistrationFlow } = require("../workflows/registerWorker");
const { showBalance } = require("../workflows/showBalance");
const { requestTimeOffModal } = require("../workflows/timeOff");
const { emergencyLeaveHandler } = require("../workflows/emergency");
const { submitIssueModal, submitSuggestionModal } = require("../workflows/support");

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

    const embed = createSuccessEmbed(
      "You're clocked in and tracking time. Use the buttons below to pause or wrap up whenever you need."
    )
      .setTitle("Clock-in successful")
      .addFields(
        {
          name: "Need to step away?",
          value: "Tap **Take a break** to pause the timer or **Clock out** when you're done.",
        },
        {
          name: "Stay updated",
          value: "We'll DM you important reminders while you're on the clock.",
        }
      );

    applyInteractionBranding(embed, interaction, {
      accentEmoji: "✅",
      color: DEFAULT_COLOR,
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("clock_break")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⏸️")
        .setLabel("Take a break"),
      new ButtonBuilder()
        .setCustomId("clock_out")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🛑")
        .setLabel("Clock out")
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    const guildName = interaction.guild?.name || "this server";
    const dmEmbed = new EmbedBuilder()
      .setDescription(
        `You're now clocked in for **${guildName}**. I'll keep you updated here while your shift is active.`
      )
      .addFields(
        {
          name: "Take a break",
          value: "Head back to the clock-in post or use `/clock break start` in the server when you need to pause.",
        },
        {
          name: "Clock out",
          value: "Use `/clock out` in the server once you're done for the day.",
        }
      );

    applyInteractionBranding(dmEmbed, interaction, {
      accentEmoji: "📨",
      color: DEFAULT_COLOR,
    });

    await notifyUserDm(interaction, { embeds: [dmEmbed] });
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
