const { EmbedBuilder } = require("discord.js");
const { applyInteractionBranding } = require("./embeds");

const CATEGORY_DEFINITIONS = [
  {
    key: "active",
    label: "🧑‍💻 Active Workers",
    prefix: "🟢",
    statuses: ["Work", "Working", "Active"],
  },
  {
    key: "break",
    label: "🍹 On Break",
    prefix: "🔴",
    statuses: ["Break", "On Break", "Pause", "Rest"],
  },
  {
    key: "holiday",
    label: "🏖️ On Holidays",
    prefix: "🔵",
    statuses: [
      "Holiday",
      "Leave",
      "Vacation",
      "Out of office",
      "Out of Office",
      "OOO",
      "Sick",
      "Away",
    ],
  },
];

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

  const categories = groupWorkersByCategory(safeWorkers);
  const embed = new EmbedBuilder()
    .setTitle("List of working members and those on leave")
    .setDescription(
      "Status updates refresh automatically as members clock in, take breaks, or request time off."
    );

  CATEGORY_DEFINITIONS.forEach((category) => {
    const workersForCategory = categories.get(category.key) || [];
    embed.addFields({
      name: category.label,
      value: formatWorkerList(workersForCategory, category.prefix),
      inline: true,
    });
  });

  return applyInteractionBranding(embed, context);
}

function groupWorkersByCategory(workers) {
  const categories = new Map(
    CATEGORY_DEFINITIONS.map((category) => [category.key, []])
  );

  workers.forEach((worker) => {
    const status = typeof worker.status === "string" ? worker.status.trim() : "Unknown";
    const normalized = status.toLowerCase();
    const matchingCategory = CATEGORY_DEFINITIONS.find((category) =>
      category.statuses.some((entry) => entry.toLowerCase() === normalized)
    );

    if (matchingCategory) {
      categories.get(matchingCategory.key).push(worker);
      return;
    }
  });

  return categories;
}

function formatWorkerList(workers, prefix) {
  if (!Array.isArray(workers) || workers.length === 0) {
    return "`None`";
  }

  return workers
    .slice(0, 20)
    .map((worker) => `${prefix ? `${prefix} ` : ""}${formatWorkerMention(worker)}`)
    .join("\n");
}

function formatWorkerMention(worker) {
  if (worker?.user_id) {
    return `<@${worker.user_id}>`;
  }

  if (worker?.username) {
    return worker.username;
  }

  return "Unknown member";
}

module.exports = {
  buildAvailabilityEmbed,
};
