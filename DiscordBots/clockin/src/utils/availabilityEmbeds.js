const { EmbedBuilder } = require("discord.js");
const { applyInteractionBranding } = require("./embeds");

function buildAvailabilityEmbed(context, workers) {
  const isArray = Array.isArray(workers);
  const safeWorkers = isArray ? workers : [];

  if (!isArray || safeWorkers.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("Availability snapshot")
      .setDescription(
        "No workers registered for this guild yet.\n_Status updates will appear here automatically._"
      );

    return applyInteractionBranding(embed, context);
  }

  const grouped = safeWorkers.reduce((acc, worker) => {
    const status = worker.status || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }

    acc[status].push(`<@${worker.user_id}>`);
    return acc;
  }, {});

  const fields = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([status, users]) => ({
      name: `${status} (${users.length})`,
      value: users.slice(0, 15).join(", ") || "—",
    }));

  const guildName = context?.guild?.name || "this guild";
  const embed = new EmbedBuilder()
    .setTitle(`Availability snapshot for ${guildName}`)
    .setDescription(
      `Backend contains **${safeWorkers.length}** registered workers.\n_Status updates refresh automatically as workers clock in, take breaks, or request time off._`
    );

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return applyInteractionBranding(embed, context);
}

module.exports = {
  buildAvailabilityEmbed,
};
