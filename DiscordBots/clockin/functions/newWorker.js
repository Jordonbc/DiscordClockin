const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const Roles = require("../models/roles.js");
const Worker = require("../models/worker.js");
const Messages = require("../models/messageIds.js");
const client = require("..");
// WE NEVER USE THIS FILE
// Utility functions
const createBackButton = () => {
  return new ButtonBuilder()
    .setCustomId("back_button")
    .setLabel("⬅️ Go Back")
    .setStyle("Secondary");
};

const handleError = async (interaction, error) => {
  const errorMessage =
    error.code === "InteractionCollectorError"
      ? "Confirmation not received within 2 minutes, cancelling"
      : `An error occurred:\n\`\`\`${error.message || error}\`\`\``;

  await interaction.message.edit({
    content: errorMessage,
    components: [],
  });
};

const createSelectMenu = (customId, placeholder, options, maxOptions = 24) => {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder);

  options.slice(0, maxOptions).forEach((option) => menu.addOptions(option));

  if (options.length > maxOptions) {
    menu.addOptions({
      label: "Next Page",
      value: "continue_2",
      emoji: "➡️",
    });
  }

  return menu;
};

async function chooseCategory(interaction, guildId) {
  try {
    const category = interaction.values[0];
    const roles = await Roles.findOne({ guildId: guildId });

    const catRoles = roles.roles.filter((role) => role.category === category);
    const roleOptions = catRoles.map((role) => ({
      label: role.name,
      value: role.id,
    }));

    const row = new ActionRowBuilder().addComponents(
      createSelectMenu(
        "newWorker_role_new_menu",
        "📌 » Select your role",
        roleOptions
      )
    );

    const backRow = new ActionRowBuilder().addComponents(createBackButton());

    const response = await interaction.update({
      components: [row, backRow],
    });

    const collectorFilter = (i) => i.user.id === interaction.user.id;
    const confirmation = await response.awaitMessageComponent({
      filter: collectorFilter,
      time: 120000,
    });

    if (confirmation.customId === "back_button") {
      // Handle going back to previous menu (you'll need to implement this based on your menu structure)
      return handleBackNavigation(confirmation, guildId);
    }

    return chooseRole(confirmation, guildId);
  } catch (error) {
    await handleError(interaction, error);
  }
}

async function chooseRole(interaction, guildId) {
  try {
    const roles = await Roles.findOne({ guildId: guildId });
    const inputString = interaction.values[0];
    const pageMatch = inputString.match(/^continue_(\d+)$/);

    if (pageMatch) {
      return handlePagination(interaction, roles, parseInt(pageMatch[1]));
    }

    const role = roles.roles.find((r) => r.id === inputString);
    if (!role) throw new Error("Role not found");

    if (role.hourlySalary.size === 1) {
      return await createWorkerProfile(
        interaction,
        role,
        role.hourlySalary.entries().next().value[0],
        guildId
      );
    }

    const experienceOptions = Array.from(role.hourlySalary.keys()).map(
      (level) => ({
        label: level,
        value: level,
      })
    );

    const row = new ActionRowBuilder().addComponents(
      createSelectMenu(
        "newWorker_new_experience_menu",
        "📌 » Experience? Check your contract",
        experienceOptions
      )
    );

    const backRow = new ActionRowBuilder().addComponents(createBackButton());

    const response = await interaction.update({
      components: [row, backRow],
    });

    const collectorFilter = (i) => i.user.id === interaction.user.id;
    const confirmation = await response.awaitMessageComponent({
      filter: collectorFilter,
      time: 120000,
    });

    if (confirmation.customId === "back_button") {
      return chooseCategory(confirmation, guildId);
    }

    return chooseExperience(
      confirmation,
      role,
      await Worker.findOne({ guildId }),
      guildId
    );
  } catch (error) {
    await handleError(interaction, error);
  }
}

async function chooseExperience(interaction, role, workers, guildId) {
  try {
    await createWorkerProfile(
      interaction,
      role,
      interaction.values[0],
      guildId
    );
  } catch (error) {
    await handleError(interaction, error);
  }
}

async function createWorkerProfile(interaction, role, experience, guildId) {
  const workers = await Worker.findOne({ guildId });
  const newWorkerData = {
    userId: interaction.user.id,
    status: "Offline",
    roleId: role.id,
    dailyWorked: 0,
    experience: experience,
    weeklyWorked: 0,
    totalWorked: 0,
  };

  workers.workers.push(newWorkerData);
  await workers.save();

  const messageDB = await Messages.findOne({
    name: "clockIn",
    guildId: guildId,
  });

  const guild = client.guilds.cache.get(messageDB.guildId);
  if (!guild) throw new Error("ClockIn message guild not found");

  const channel = guild.channels.cache.get(messageDB.channelId);
  if (!channel) throw new Error("ClockIn message not found");

  let url = "";
  const msg = await channel.messages.fetch(messageDB.id);
  url = msg.url;

  const embed = new EmbedBuilder()
    .setTitle("Created your profile!")
    .setDescription(
      `You successfully created your profile, with \`${
        experience ? `${experience} ` : ""
      }${role.name}\` as job.`
    )
    .setColor("Green");

  return interaction.update({ embeds: [embed], components: [] });
}

async function handlePagination(interaction, roles, page) {
  const itemsPerPage = 24;
  const startIndex = (page - 1) * itemsPerPage;

  const roleOptions = roles.roles
    .slice(startIndex, startIndex + itemsPerPage)
    .map((role) => ({
      label: role.name,
      value: role.id,
    }));

  if (startIndex > 0) {
    roleOptions.unshift({
      label: `Previous Page`,
      value: `continue_${page - 1}`,
      emoji: "⬅️",
    });
  }

  if (roles.roles.length > startIndex + itemsPerPage) {
    roleOptions.push({
      label: `Next Page`,
      value: `continue_${page + 1}`,
      emoji: "➡️",
    });
  }

  const row = new ActionRowBuilder().addComponents(
    createSelectMenu(
      "newWorker_role_menu",
      "📌 » Choose your role",
      roleOptions
    )
  );

  const backRow = new ActionRowBuilder().addComponents(createBackButton());

  return interaction.update({
    components: [row, backRow],
  });
}

async function handleBackNavigation(interaction, guildId) {
  // Implement your logic to return to the previous menu
  // This will depend on how your initial category selection is structured
  const roles = await Roles.findOne({ guildId: guildId });

  // Recreate the initial category selection menu
  const categoryOptions = [
    ...new Set(roles.roles.map((role) => role.category)),
  ].map((category) => ({
    label: category,
    value: category,
  }));

  const row = new ActionRowBuilder().addComponents(
    createSelectMenu(
      "newWorker_category_menu",
      "📌 » Select a category",
      categoryOptions
    )
  );

  return interaction.update({
    components: [row],
  });
}

module.exports = { chooseCategory };
