const worker = require("../models/worker.js");
const role = require("../models/roles.js");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  id: "new_worker_experience_select",
  run: async (client, interaction) => {
    const selectedExperience = interaction.values[0];
    const oldEmbed = interaction.message.embeds[0];

    // Extract previously selected category, role, and user
    const description = oldEmbed.description;
    const categoryMatch = description.match(/Category: ([^\n]+)/);
    const roleMatch = description.match(/Role: ([^\n]+)/);
    const userMatch = description.match(/Setting up worker: (.+) \((\d+)\)/);

    if (!categoryMatch || !roleMatch || !userMatch) {
      return interaction.update({
        content: "Error: Missing required selections. Please try again.",
        components: [],
      });
    }

    const selectedCategory = categoryMatch[1];
    const selectedRoleName = roleMatch[1];
    const userId = userMatch[2]; // Extract the userId from the embed

    // Fetch user by ID from the guild
    const user = await interaction.guild.members
      .fetch(userId)
      .catch(() => null);

    if (!user) {
      return interaction.update({
        content: "Error: User not found. Please try again.",
        components: [],
      });
    }

    // Find the role data
    const guildRoles = await role.findOne({ guildId: interaction.guild.id });
    const roleData = guildRoles.roles.find((r) => r.name === selectedRoleName);

    if (!roleData) {
      return interaction.update({
        content: "Error: Role not found. Please try again.",
        components: [],
      });
    }

    try {
      // Fetch the existing guild worker document
      let guildWorkers = await worker.findOne({
        guildId: interaction.guild.id,
      });

      if (!guildWorkers) {
        guildWorkers = await worker.create({
          guildId: interaction.guild.id,
          workers: [],
        });
      }

      // Create the new worker object
      const newWorker = {
        userId: userId,
        clockDates: { clockIn: [], clockOut: [] },
        afkDates: { afkIn: [], afkOut: [] },
        onLeave: { start: null, end: null },
        clockInMessage: "",
        afkMessage: "",
        status: "Offline",
        experience: selectedExperience,
        roleId: roleData.id,
        breaksCount: 0,
        worked: 0,
        breakTime: 0,
        dailyWorked: 0,
        weeklyWorked: 0,
        totalWorked: 0,
      };

      // Push the worker and save
      guildWorkers.workers.push(newWorker);
      await guildWorkers.save();

      const embed = new EmbedBuilder()
        .setTitle("Worker Created Successfully")
        .setDescription(
          `Worker has been created with the following details:\n\nUser: ${user.user.tag} (${userId})\nCategory: ${selectedCategory}\nRole: ${selectedRoleName}\nExperience: ${selectedExperience}`
        )
        .setColor("#00FF00");

      await interaction.update({
        embeds: [embed],
        components: [],
      });
    } catch (error) {
      console.error("Error creating worker:", error);
      const embed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(
          "An error occurred while creating the worker. Please try again."
        )
        .setColor("#FF0000");

      await interaction.update({
        embeds: [embed],
        components: [],
      });
    }
  },
};
