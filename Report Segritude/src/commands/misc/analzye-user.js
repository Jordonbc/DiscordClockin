const GuildWorkers = require("../../models/guildWorkers");
const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const connectToDatabase = require("../../utils/database/db");

async function getUserWorkData(guildId, userId) {
  await connectToDatabase();
  const guild = await GuildWorkers.findOne({ guildId }).lean();
  if (!guild) return null;

  return guild.workers.find((worker) => worker.userId === userId) || null;
}

function formatUserDataForLLM(worker) {
  return {
    model: "mistral:latest",
    prompt: `Analyze this user's work data and return a **structured summary based on the format below**.  
  ### User Data:
  ${JSON.stringify(worker, null, 2)}
  
  Each clockin time is mapped to a corresponding clockout time in epoch format.

  Status refers to what the user is currently doing (e.g., Working, Break, etc.), thus it is safe to ignore it

  ### Response Format (strictly follow this!):
  ---
  📊 **Performance Summary:**  
  - [Short analysis of user's efficiency & trends]  
  - How much did they work this week
  
  ✅ **Strengths:**  
  At least 3 strengths in bullet point markdown format
  
  ⚠️ **Areas for Improvement:**  
  At least 3 areas for improvement in bullet point markdown format
  
  📌 **Recommended Actions:**  
  - Bullet point 1  
  - Bullet point 2  
  ---
  **Important:**  
  - DO NOT include any thoughts, calculations, or explanations.  
  - ONLY return structured results in the format above.  
  - Keep it **concise and direct**.`,
    stream: false,
    options: {
      temperature: 0.5, // Reduce randomness
      num_predict: 400, // Keep response length controlled
    },
  };
}

async function generateUserAnalysis(worker) {
  const payload = formatUserDataForLLM(worker);

  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data.response;
  } catch (error) {
    console.error("❌ Error fetching LLM response:", error);
    return "⚠️ Failed to generate user analysis. Please check if Ollama is running.";
  }
}

function cleanLLMResponse(response) {
  return response.replace(/<think>.*?<\/think>/gs, "").trim();
}

async function sendUserAnalysis(client, interaction, userId, analysisText) {
  const embed = new EmbedBuilder()
    .setTitle("📊 User Work Analysis")
    .setColor("#2ecc71")
    .setDescription(analysisText)
    .addFields({ name: "User ID", value: `<@${userId}>` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  name: "analyze-user",
  description: "Analyzes work trends for a specific user!",
  testOnly: true,

  callback: async (client, interaction) => {
    try {
      await interaction.deferReply();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      const worker = await getUserWorkData(guildId, userId);
      if (!worker) {
        return interaction.editReply(
          "No work data found for you in this guild."
        );
      }

      let analysis = await generateUserAnalysis(worker);
      //   analysis = cleanLLMResponse(analysis);

      await sendUserAnalysis(client, interaction, userId, analysis);
    } catch (error) {
      console.error("Error in user analysis command:", error);
      await interaction.editReply(
        "An error occurred while analyzing user data. Please try again later."
      );
    }
  },
};
