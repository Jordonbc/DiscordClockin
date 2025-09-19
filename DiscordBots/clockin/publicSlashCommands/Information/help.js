const {
  EmbedBuilder,
  ApplicationCommandType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const getLocalCommands = require("../../utils/getLocalCommands.js");

const categoryEmojiList = {
  Admin: "👩🏻‍💻",
  Information: "ℹ️",
  Setup: "⚙️",
};

module.exports = {
  name: "help",
  description: "Shows all important commands",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
  options: [],
  category: "Information",
  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const publicLocalCommands = getLocalCommands([], "publicSlashCommands");

      const commandsWithCategory = publicLocalCommands.filter(
        (cmd) => cmd.category
      );
      const categories = Array.from(
        new Set(commandsWithCategory.map((cmd) => cmd.category))
      );

      if (categories.length === 0) {
        return interaction.editReply({
          content:
            "❌ No command categories found. Please check if commands have a `category` field.",
          ephemeral: true,
        });
      }

      const options = categories.slice(0, 25).map((category) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(category)
          .setEmoji(categoryEmojiList[category] || "📄")
          .setValue(`help_${category}_menuOption`)
      );

      const user = await client.users.fetch(client.user.id, { force: true });
      const bannerURL =
        user.bannerURL({ format: "png", size: 1024 }) ||
        "https://i.imgur.com/abKnqEb.jpeg";

      const embedImage = new EmbedBuilder()
        .setImage(bannerURL)
        .setColor("#81e6ff");

      const embed = new EmbedBuilder()
        .setTitle("/ » **__COMMANDS__**")
        .setDescription(
          "Here you find all commands. Choose one category from the menu."
        )
        .setColor("#81e6ff");

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("help_menu")
          .setPlaceholder("📌 » Command overview")
          .addOptions(options)
      );

      await interaction.editReply({
        embeds: [embedImage, embed],
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in help command:", error);
      await interaction.editReply({
        content:
          "❌ An error occurred while processing your request. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
