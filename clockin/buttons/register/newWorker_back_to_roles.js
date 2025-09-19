const { StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const Roles = require("../../models/roles.js");

// Back to Roles Handler
module.exports = {
  id: "newWorker_back_to_roles",
  run: async (client, interaction) => {
    const guildId = interaction.customId.split("-")[1];
    const category = interaction.customId.split("-")[2];
    const roles = await Roles.findOne({ guildId: guildId });

    const categoryRoles = roles.roles.filter(
      (role) => role.category === category
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`newWorker_role_menu-${guildId}`)
      .setPlaceholder("📌 » Select your role");

    categoryRoles.slice(0, 24).forEach((role) => {
      selectMenu.addOptions({
        label: role.name,
        value: `${role.id}_${category}`,
      });
    });

    if (categoryRoles.length > 24) {
      selectMenu.addOptions({
        label: "Next Page",
        value: `page_2_${category}`,
        emoji: "➡️",
      });
    }

    const backButton = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`newWorker_back_to_categories-${guildId}`)
        .setPlaceholder("⬅️ Back to Categories")
        .addOptions(
          roles.categorys.map((cat) => ({
            label: cat,
            value: cat,
          }))
        )
    );

    await interaction.update({
      components: [
        new ActionRowBuilder().addComponents(selectMenu),
        backButton,
      ],
    });
  },
};
