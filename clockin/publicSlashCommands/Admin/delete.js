const {
  EmbedBuilder,
  ApplicationCommandType,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} = require("discord.js");
const {
  deleteWorkers,
  deleteRoles,
  deleteAll,
} = require("../../functions/deleteData.js");

module.exports = {
  name: "delete",
  description: "» Delete something from the database",
  cooldown: 3000,
  guildOnly: true,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  category: "Admin",
  options: [
    {
      name: "workers",
      description: "Delete all workers",
      type: 1,
    },
    {
      name: "roles",
      description: "Delete all roles",
      type: 1,
    },
    {
      name: "all",
      description: "Delete all data from the database",
      type: 1,
    },
  ],
  deleted: true,
  run: async (client, interaction) => {
    await interaction.deferReply();
    if (interaction.options._subcommand === "workers") {
      deleteWorkers(interaction);
    } else if (interaction.options._subcommand === "roles") {
      deleteRoles(interaction);
    } else if (interaction.options._subcommand === "all") {
      deleteAll(interaction);
    }
  },
};
