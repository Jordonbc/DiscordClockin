const { StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const Roles = require("../../models/roles.js");

// Back to Categories Handler
module.exports = {
  id: "newWorker_back_to_categories",
  run: async (client, interaction) => {
    const guildId = interaction.customId.split("-")[1];
    const roles = await Roles.findOne({ guildId: guildId });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`newWorker_category_menu-${guildId}`)
      .setPlaceholder("📌 » Select a category");

    roles.categorys.forEach((category) => {
      selectMenu.addOptions({
        label: category,
        value: category,
      });
    });

    await interaction.update({
      components: [new ActionRowBuilder().addComponents(selectMenu)],
    });
  },
};
