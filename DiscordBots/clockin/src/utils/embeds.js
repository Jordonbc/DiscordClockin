const { EmbedBuilder } = require("discord.js");
const { ApiError } = require("../apiClient");

function createErrorEmbed(error) {
  if (error instanceof ApiError) {
    return new EmbedBuilder()
      .setColor("Red")
      .setTitle("Something went wrong")
      .setDescription(error.message || "An unknown error occurred while contacting the backend.")
      .setFooter({ text: `API error (${error.status}${error.code ? ` • ${error.code}` : ""})` });
  }

  return new EmbedBuilder()
    .setColor("Red")
    .setTitle("Unexpected error")
    .setDescription("An unexpected error occurred. Please try again later.");
}

function createSuccessEmbed(description) {
  return new EmbedBuilder().setColor("Green").setDescription(description);
}

module.exports = {
  createErrorEmbed,
  createSuccessEmbed,
};
