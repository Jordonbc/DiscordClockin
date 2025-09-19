const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Roles = require("../models/roles.js");
const { createWorker } = require("./newWorkerExperience.js");

module.exports = {
  id: "newWorker_role_menu",
  run: async (client, interaction) => {
    const [roleId, category] = interaction.values[0].split("_");

    const guildId = interaction.customId.split("-")[1];
    console.log(
      "newWorker_role_menu invoked",
      JSON.stringify({
        guildId,
        userId: interaction.user?.id,
        roleId,
        rawCustomId: interaction.customId,
      })
    );

    // Check if this is a pagination request
    if (roleId === "page") {
      return handlePagination(interaction, category);
    }

    // Find roles based on the category input
    const roles = await Roles.findOne({ guildId: guildId });

    if (!roles) {
      return interaction.reply({
        content: "No roles found for this category.",
        ephemeral: true,
      });
    }

    const selectedRole = roles.roles.find((r) => r.id === roleId);

    if (!selectedRole) {
      return interaction.reply({
        content: "Role not found. Please try again.",
        ephemeral: true,
      });
    }

    // If role has only one salary level, create worker directly
    if (selectedRole.hourlySalary.size === 1) {
      const experience = selectedRole.hourlySalary.keys().next().value;
      return createWorker(
        interaction,
        roleId,
        experience,
        category,
        guildId
      );
    }

    // Create experience selection menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`newWorker_experience_menu-${guildId}`)
      .setPlaceholder("📌 » Select your experience level");

    // Add experience options
    for (const [level] of selectedRole.hourlySalary) {
      selectMenu.addOptions({
        label: level,
        value: `${level}_${roleId}_${category}`, // Store role and category for back navigation
      });
    }

    // let iterableExeperiences = selectedRole.experiences || roles.experiences;

    // for (const level of iterableExeperiences) {
    //   selectMenu.addOptions({
    //     label: level,
    //     value: `${level}_${roleId}_${category}`, // Store role and category for back navigation
    //   });
    // }

    const backButton = new ActionRowBuilder().addComponents(
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

async function handlePagination(interaction, category) {
  const pageNumber = parseInt(interaction.values[0].split("_")[1]);
  const roles = await Roles.findOne({ guildId: interaction.guildId });

  const categoryRoles = roles.roles.filter(
    (role) => role.category === category
  );
  const startIndex = (pageNumber - 1) * 24;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("newWorker_role_menu")
    .setPlaceholder("📌 » Select your role");

  // Add previous page option if not on first page
  if (pageNumber > 1) {
    selectMenu.addOptions({
      label: "Previous Page",
      value: `page_${pageNumber - 1}_${category}`,
      emoji: "⬅️",
    });
  }

  // Add role options
  categoryRoles.slice(startIndex, startIndex + 23).forEach((role) => {
    selectMenu.addOptions({
      label: role.name,
      value: `${role.id}_${category}`,
    });
  });

  // Add next page option if more roles exist
  if (categoryRoles.length > startIndex + 23) {
    selectMenu.addOptions({
      label: "Next Page",
      value: `page_${pageNumber + 1}_${category}`,
      emoji: "➡️",
    });
  }

  const backButton = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("newWorker_back_to_categories")
      .setPlaceholder("⬅️ Back to Categories")
      .addOptions(
        roles.categorys.map((cat) => ({
          label: cat,
          value: cat,
        }))
      )
  );

  await interaction.update({
    components: [new ActionRowBuilder().addComponents(selectMenu), backButton],
  });
}
