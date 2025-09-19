const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const connectToDatabase = require("../../utils/database/db");
const GuildWorkers = require("../../models/guildWorkers");
const backendApi = require("../../utils/backendApi");

async function getWeeklyWorkData(guildId) {
  const workersFromBackend = await loadWorkersFromBackend(guildId);

  if (workersFromBackend) {
    return workersFromBackend.map(mapWorkerForAnalysis);
  }

  await connectToDatabase();
  const guild = await GuildWorkers.findOne({ guildId }).lean();
  if (!guild) return [];

  return guild.workers.map(mapWorkerForAnalysis);
}

function formatWorkDataForLLM(workData) {
  return {
    model: "deepseek-r1:7b", // Using the 7B Qwen model
    prompt: `Generate a weekly work summary for a team of workers. Analyze trends, highlight top performers, and suggest improvements.
      
Here is the structured data:

${JSON.stringify(workData, null, 2)}`,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 500, // similar to max_tokens in OpenAI
    },
  };
}

async function generateWeeklySummary(workData) {
  const payload = formatWorkDataForLLM(workData);

  try {
    // Assuming Ollama is running locally on the default port
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.response;
  } catch (error) {
    console.error("❌ Error fetching LLM response:", error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return "⚠️ Failed to generate summary. Please check if Ollama is running.";
  }
}

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

function mapWorkerForAnalysis(worker) {
  return {
    userId: worker.userId,
    role: worker.roleId,
    experience: worker.experience,
    weeklyWorked: worker.weeklyWorked,
    totalWorked: worker.totalWorked,
    breaksTaken: worker.breaksCount,
    breakTime: worker.breakTime,
  };
}

async function sendWeeklySummary(client, interaction, summaryText) {
  const embed = new EmbedBuilder()
    .setTitle("📊 Weekly Work Summary")
    .setColor("#3498db")
    .setDescription(summaryText)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  name: "analyze-weekly-reports",
  description:
    "Analyzes weekly work reports using DeepSeek-R1 model via Ollama",
  testOnly: true,

  callback: async (client, interaction) => {
    try {
      await interaction.deferReply(); // Add this to handle potentially longer processing time

      const workData = await getWeeklyWorkData(interaction.guild.id);

      // Add some basic validation
      if (!workData || workData.length === 0) {
        return interaction.editReply("No work data found for this guild.");
      }

      const summary = await generateWeeklySummary(workData);

      // Check if summary is too long for Discord embed (max 4096 characters)
      if (summary.length > 4000) {
        const trimmedSummary = summary.substring(0, 3997) + "...";
        const embed = new EmbedBuilder()
          .setTitle("📊 Weekly Work Summary")
          .setColor("#3498db")
          .setDescription(trimmedSummary)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        await sendWeeklySummary(client, interaction, summary);
      }
    } catch (error) {
      console.error("Error in weekly report command:", error);
      await interaction.editReply(
        "An error occurred while generating the weekly report. Please check if Ollama is running."
      );
    }
  },
};
