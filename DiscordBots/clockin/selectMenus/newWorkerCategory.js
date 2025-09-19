const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Roles = require("../models/roles.js");

module.exports = {
  id: "newWorker_category_menu",
  run: async (client, interaction) => {
    const category = interaction.values[0];

    const guildId = interaction.customId.split("-")[1];

    // Find roles based on the guild id
    const roles = await Roles.findOne({ guildId: guildId });

    if (!roles) {
      return interaction.reply({
        content: "No roles found for this category.",
        ephemeral: true,
      });
    }

    // Filter roles by selected category
    const categoryRoles = roles.roles.filter(
      (role) => role.category === category
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`newWorker_role_menu-${guildId}`)
      .setPlaceholder("📌 » Select your role");

    // Add role options (up to 24)
    categoryRoles.slice(0, 24).forEach((role) => {
      selectMenu.addOptions({
        label: role.name,
        value: `${role.id}_${category}`, // Store category for back navigation
      });
    });

    // Add pagination if needed
    if (categoryRoles.length > 24) {
      selectMenu.addOptions({
        label: "Next Page",
        value: `page_2_${category}`,
        emoji: "➡️",
      });
    }

    const backButton = new ActionRowBuilder().addComponents(
      // new StringSelectMenuBuilder()
      //   .setCustomId(`newWorker_back_to_categories-${guildId}`)
      //   .setPlaceholder("⬅️ Back to Categories")
      //   .addOptions(
      //     roles.categorys.map((cat) => ({
      //       label: cat,
      //       value: cat,
      //     }))
      //   )
      //create a button that goes back to the categories
      new ButtonBuilder()
        .setCustomId(`newWorker_back_to_categories-${guildId}`)
        .setLabel("Back to Categories")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬅️")
    );

    await interaction.update({
      components: [
        new ActionRowBuilder().addComponents(selectMenu),
        backButton,
      ],
    });
  },
};
