//selectMenus/new_worker_category_select.js
const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const role = require("../models/roles.js");

module.exports = {
  id: "new_worker_category_select",
  run: async (client, interaction) => {
    const selectedCategory = interaction.values[0];
    const guildRoles = await role.findOne({ guildId: interaction.guild.id });

    // Extract worker information from embed description
    const newWorkerDescription =
      interaction.message.embeds[0].description.match(
        /Setting up worker: (.+) \((\d+)\)/
      );

    if (!newWorkerDescription) {
      return interaction.update({
        content: ":x: Error retrieving worker information.",
        components: [],
      });
    }

    const [_, workerTag, workerId] = newWorkerDescription;

    // Filter roles for selected category
    const categoryRoles = guildRoles.roles.filter(
      (role) => role.category === selectedCategory
    );

    // Create role select menu
    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId("new_worker_role_select")
      .setPlaceholder("Select a role")
      .addOptions(
        categoryRoles.map((role) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setValue(role.id)
            .setDescription(`Select ${role.name} role`)
        )
      );

    // Create experience select menu
    const experienceSelect = new StringSelectMenuBuilder()
      .setCustomId("new_worker_experience_select")
      .setPlaceholder("Select experience level")
      .addOptions(
        guildRoles.experiences.map((exp) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(exp)
            .setValue(exp)
            .setDescription(`Select ${exp} experience level`)
        )
      );

    const roleRow = new ActionRowBuilder().addComponents(roleSelect);
    const experienceRow = new ActionRowBuilder().addComponents(
      experienceSelect
    );

    const embed = new EmbedBuilder()
      .setTitle("Create New Worker")
      .setDescription(
        `Setting up worker: ${workerTag} (${workerId})\nSelected Category: ${selectedCategory}\nPlease select a role and experience level.`
      )
      .setColor("#2B2D31");

    await interaction.update({
      embeds: [embed],
      components: [roleRow, experienceRow],
    });
  },
};
