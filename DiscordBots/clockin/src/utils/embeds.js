const { EmbedBuilder } = require("discord.js");
const { ApiError } = require("../apiClient");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#5865F2";
const ERROR_COLOR = process.env.ERROR_COLOR || "#EF4444";
const BRAND_FOOTER = process.env.BOT_CREDITS || "Clockin Workforce Tools";

function createErrorEmbed(error) {
  if (error instanceof ApiError) {
    return new EmbedBuilder()
      .setColor(ERROR_COLOR)
      .setTitle("Something went wrong")
      .setDescription(error.message || "An unknown error occurred while contacting the backend.")
      .setFooter({ text: `API error (${error.status}${error.code ? ` • ${error.code}` : ""})` });
  }

  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setTitle("Unexpected error")
    .setDescription("An unexpected error occurred. Please try again later.");
}

function createSuccessEmbed(description, { color = DEFAULT_COLOR, footerText, timestamp } = {}) {
  const embed = new EmbedBuilder().setColor(color);

  if (description) {
    embed.setDescription(description);
  }

  if (footerText) {
    embed.setFooter({ text: footerText });
  }

  if (timestamp) {
    embed.setTimestamp(timestamp === true ? Date.now() : timestamp);
  }

  return embed;
}

function applyInteractionBranding(
  embed,
  interaction,
  { accentEmoji, color = DEFAULT_COLOR, footerText = BRAND_FOOTER, includeTimestamp = true } = {}
) {
  if (!embed) {
    throw new Error("applyInteractionBranding requires an embed instance");
  }

  embed.setColor(color);

  if (interaction?.client?.user) {
    const botUser = interaction.client.user;
    const iconURL = typeof botUser.displayAvatarURL === "function"
      ? botUser.displayAvatarURL({ size: 256 })
      : undefined;
    const authorName = `${accentEmoji ? `${accentEmoji} ` : ""}${botUser.username}`;
    embed.setAuthor({ name: authorName, iconURL: iconURL || undefined });
  }

  if (footerText) {
    const footerIcon = interaction?.guild?.iconURL?.({ size: 128 }) || undefined;
    embed.setFooter({ text: footerText, iconURL: footerIcon });
  }

  if (includeTimestamp) {
    embed.setTimestamp();
  }

  return embed;
}

module.exports = {
  createErrorEmbed,
  createSuccessEmbed,
  applyInteractionBranding,
};
