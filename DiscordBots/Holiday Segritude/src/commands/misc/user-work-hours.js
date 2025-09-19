const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const GuildWorkers = require("../../models/guildWorkers");
const connectToDatabase = require("../../utils/database/db");
const backendApi = require("../../utils/backendApi");

module.exports = {
  name: "user-work-hours",
  description: "Displays current work hours for all workers!",
  testOnly: false,

  async callback(client, interaction) {
    await interaction.deferReply();

    try {
      const guildId = interaction.guild.id;
      let workers = await loadWorkersFromBackend(guildId);

      if (!workers) {
        await connectToDatabase();
        const guildWorkersData = await GuildWorkers.findOne({ guildId });

        if (!guildWorkersData?.workers?.length) {
          return interaction.editReply("No workers found in this guild.");
        }

        workers = guildWorkersData.workers;
      }

      workers.sort(
        (a, b) => hoursValue(b.weeklyWorked) - hoursValue(a.weeklyWorked)
      );

      // Create embeds (maximum 25 fields per embed, and max 10 embeds per message)
      const WORKERS_PER_EMBED = 10; // Number of workers per embed
      const embeds = [];
      let currentPage = 1;
      const totalPages = Math.ceil(workers.length / WORKERS_PER_EMBED);

      for (let i = 0; i < workers.length; i += WORKERS_PER_EMBED) {
        const workersChunk = workers.slice(i, i + WORKERS_PER_EMBED);

        const embed = new EmbedBuilder()
          .setTitle(`${interaction.guild.name} Workers Hours`)
          .setColor("#0099ff")
          .setDescription(
            `Showing workers ${i + 1}-${Math.min(
              i + WORKERS_PER_EMBED,
              workers.length
            )} of ${workers.length}`
          )
          .setFooter({ text: `Page ${currentPage}/${totalPages}` })
          .setTimestamp();

        for (const worker of workersChunk) {
          // Get user from client cache if possible
          const user = await client.users
            .fetch(worker.userId)
            .catch(() => null);
          const username = user ? user.username : worker.userId;

          // Format status with emoji
          let statusEmoji = "🔴"; // Default offline
          if (worker.status === "Work") statusEmoji = "🟢";
          else if (worker.status === "Break") statusEmoji = "🟠";

          // Format experience level
          const experience = worker.experience ? worker.experience : "N/A";

          const weeklyHours = formatHours(hoursValue(worker.weeklyWorked));
          const dailyHours = formatHours(hoursValue(worker.dailyWorked));

          embed.addFields({
            name: `${statusEmoji} ${username} (${experience})`,
            value: `Daily: **${dailyHours}** | Weekly: **${weeklyHours}**`,
            inline: false,
          });
        }

        embeds.push(embed);
        currentPage++;
      }

      // If there's only one page, just send the embed
      if (embeds.length === 1) {
        return interaction.editReply({ embeds: [embeds[0]] });
      }

      // Otherwise, create pagination buttons
      let currentEmbedIndex = 0;

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(embeds.length <= 1)
      );

      const response = await interaction.editReply({
        embeds: [embeds[0]],
        components: [buttons],
      });

      // Create collector for button interactions
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000, // 1 minute timeout
      });

      collector.on("collect", async (i) => {
        if (i.customId === "prev") {
          currentEmbedIndex--;
        } else if (i.customId === "next") {
          currentEmbedIndex++;
        }

        // Update button states
        const row = ActionRowBuilder.from(i.message.components[0]);
        row.components[0].setDisabled(currentEmbedIndex === 0);
        row.components[1].setDisabled(currentEmbedIndex === embeds.length - 1);

        await i.update({
          embeds: [embeds[currentEmbedIndex]],
          components: [row],
        });
      });

      collector.on("end", async () => {
        // Disable all buttons when collector ends
        const disabledButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        );

        await interaction
          .editReply({
            embeds: [embeds[currentEmbedIndex]],
            components: [disabledButtons],
          })
          .catch(() => {});
      });
    } catch (error) {
      console.error("Error in user-work-hours command:", error);
      return interaction.editReply(
        "An error occurred while fetching worker data."
      );
    }
  },
};

async function loadWorkersFromBackend(guildId) {
  try {
    const response = await backendApi.listWorkers({ guildId });

    if (!response || !Array.isArray(response.workers) || !response.workers.length) {
      return null;
    }

    return response.workers;
  } catch (error) {
    console.error("Failed to load workers from backend:", error);
    return null;
  }
}

function formatHours(hours) {
  const totalMinutes = Math.round((hours || 0) * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = Math.max(totalMinutes - wholeHours * 60, 0);

  return `${wholeHours}h ${minutes}m`;
}

function hoursValue(value) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : 0;
}
