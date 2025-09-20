const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { createErrorEmbed } = require("../utils/embeds");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#00FF00";

async function showRegistrationFlow(interaction, { api }) {
  try {
    const data = await api.getRoles({ guildId: interaction.guildId });
    if (!data || !Array.isArray(data.roles) || data.roles.length === 0) {
      await interaction.reply({
        embeds: [createErrorEmbed(new Error("No roles are configured for this guild yet."))],
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(DEFAULT_COLOR)
      .setTitle("Register as a worker")
      .setDescription(
        "Select the role you would like to register for. You will then be asked to choose an experience level if applicable."
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId("register_select_role")
      .setPlaceholder("Select a role")
      .setMinValues(1)
      .setMaxValues(1);

    for (const role of data.roles) {
      menu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(role.name.slice(0, 100))
          .setDescription(role.category ? role.category.slice(0, 100) : "")
          .setValue(role.id)
      );
    }

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  } catch (error) {
    const embed = createErrorEmbed(error);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function completeRegistration(interaction, { api }, roleId, experience) {
  try {
    const response = await api.registerWorker({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      roleId,
      experience,
    });

    const worker = response.worker;
    const embed = new EmbedBuilder()
      .setColor(DEFAULT_COLOR)
      .setTitle("Registration complete")
      .setDescription("You are ready to start clocking in!")
      .addFields(
        { name: "Role", value: worker.role_id, inline: true },
        {
          name: "Experience",
          value: worker.experience || "Not set",
          inline: true,
        }
      );

    await interaction.update({ embeds: [embed], components: [] });
  } catch (error) {
    const embed = createErrorEmbed(error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}

module.exports = {
  showRegistrationFlow,
  completeRegistration,
};
