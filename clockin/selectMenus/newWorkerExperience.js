const { EmbedBuilder } = require("discord.js");
const Roles = require("../models/roles.js");
const Worker = require("../models/worker.js");
const Messages = require("../models/messageIds.js");

module.exports = {
  id: "newWorker_experience_menu",
  run: async (client, interaction) => {
    const [experience, roleId, category] = interaction.values[0].split("_");
    const guildId = interaction.customId.split("-")[1];
    await createWorker(interaction, roleId, experience, category, guildId);
  },
};

module.exports.createWorker = createWorker;

async function createWorker(
  interaction,
  roleId,
  experience,
  category,
  guildId
) {
  try {
    let workers = await Worker.findOne({ guildId: guildId });
    if (!workers) {
      workers = await Worker.create({ guildId: guildId, workers: [] });
    }
    // Find roles based on the guild id
    const roles = await Roles.findOne({ guildId: guildId });

    if (!roles) {
      return interaction.reply({
        content: "No roles found for this category.",
        ephemeral: true,
      });
    }

    const role = roles.roles.find((r) => r.id === roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Check if worker already exists
    const existingWorker = workers.workers.find(
      (w) => w.userId === interaction.user.id
    );

    if (existingWorker) {
      return interaction.update({
        content: "You already have a worker profile!",
        components: [],
        embeds: [],
      });
    }

    const newWorkerData = {
      userId: interaction.user.id,
      status: "Offline",
      roleId: roleId,
      dailyWorked: 0,
      experience: experience,
      weeklyWorked: 0,
      totalWorked: 0,
    };

    console.log(
      "Creating worker entry",
      JSON.stringify({
        guildId,
        roleId,
        experience,
        userId: interaction.user.id,
      })
    );

    await Worker.updateOne(
      { guildId: guildId },
      { $push: { workers: newWorkerData } },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setTitle("Created your profile!")
      .setDescription(
        `You successfully created your profile, with \`${experience} ${role.name}\` as job.`
      )
      .setColor("Green");

    await interaction.update({
      embeds: [embed],
      components: [],
    });
  } catch (error) {
    console.error("Error creating worker:", error);
    await interaction.update({
      content:
        "An error occurred while creating your profile. Please try again.",
      components: [],
      embeds: [],
    });
  }
}
