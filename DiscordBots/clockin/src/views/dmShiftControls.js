const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

function buildClockedInView({ guildName, guildId }) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle("You're clocked in")
        .setDescription(
          `I'm tracking your shift for **${guildName}**. Use the buttons below when you need to pause or wrap up.`
        ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`clock_break:${guildId}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⏸️")
          .setLabel("Take a break"),
        new ButtonBuilder()
          .setCustomId(`clock_out:${guildId}`)
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🛑")
          .setLabel("Clock out")
      ),
    ],
  };
}

function buildOnBreakView({ guildName, guildId }) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle("Break in progress")
        .setDescription(
          `You're on break for **${guildName}**. I'll keep the timer paused until you tap **Return to work**.`
        ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`clock_break_end:${guildId}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji("▶️")
          .setLabel("Return to work"),
        new ButtonBuilder()
          .setCustomId(`clock_out:${guildId}`)
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🛑")
          .setLabel("Clock out")
      ),
    ],
  };
}

function buildClockedOutView({ guildName, totalWorkedHours }) {
  const description = totalWorkedHours
    ? `You're clocked out from **${guildName}** with ${totalWorkedHours.toFixed(2)}h logged. Nice work today!`
    : `You're clocked out from **${guildName}**. Nice work today!`;

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle("Clocked out")
        .setDescription(description),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("clock_break_disabled")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Take a break")
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("clock_out_disabled")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Clock out")
          .setDisabled(true)
      ),
    ],
  };
}

module.exports = {
  buildClockedInView,
  buildOnBreakView,
  buildClockedOutView,
};
