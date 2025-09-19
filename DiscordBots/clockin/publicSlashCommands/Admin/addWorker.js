//publicSlashCommands\Admin\addWorker.js

const {
  EmbedBuilder,
  ApplicationCommandType,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const worker = require("../../models/worker.js");
const settings = require("../../models/guildSettings.js");
const role = require("../../models/roles.js");

module.exports = {
  name: "addworker",
  description: "» Create a new worker for a guild",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  default_member_permissions: "Administrator",
  plan: "Basic",
  category: "Admin",
  options: [
    {
      name: "user",
      description: "Tag the worker user",
      type: 6, // 6 represents a USER type
      required: true,
    },
  ],

  run: async (client, interaction) => {
    await interaction.deferReply({ flags: 64 });

    // Fetch the guild settings
    const guildSettings = await settings.findOne({
      guildId: interaction.guild.id,
    });
    const guildRoles = await role.findOne({ guildId: interaction.guild.id });

    if (!guildSettings) {
      return interaction.editReply({
        content: ":x: Guild settings not found.",
      });
    }

    if (!guildRoles?.roles?.length) {
      return interaction.editReply({
        content: ":x: No roles defined for this server.",
      });
    }

    if (!guildRoles?.experiences?.length) {
      return interaction.editReply({
        content: ":x: No experience levels defined for this server.",
      });
    }

    const user = interaction.options.getUser("user");

    // Check if the user exists in the guild workers
    const guildWorkers = await worker.findOne({
      guildId: interaction.guild.id,
    });

    const doesWorkerExist = guildWorkers.workers.find(
      (w) => w.userId === user.id
    );

    if (doesWorkerExist) {
      return interaction.editReply({
        content: ":x: This user is already a worker in this guild.",
      });
    }

    // Create category select menu
    const categorySelect = new StringSelectMenuBuilder()
      .setCustomId("new_worker_category_select")
      .setPlaceholder("Select a category")
      .addOptions(
        guildRoles.categorys.map((category) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(category)
            .setValue(category)
            .setDescription(`Select ${category} category`)
        )
      );

    // Initial embed
    const embed = new EmbedBuilder()
      .setTitle("Create New Worker")
      .setDescription(
        `Setting up worker: ${user.tag} (${user.id})\nPlease select a category first.`
      )
      .setColor("#00FF00"); // green color

    const categoryRow = new ActionRowBuilder().addComponents(categorySelect);

    await interaction.editReply({
      embeds: [embed],
      components: [categoryRow],
    });
  },
};
