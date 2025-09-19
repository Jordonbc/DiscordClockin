const { EmbedBuilder, RoleSelectMenuBuilder } = require("discord.js");
const Roles = require("../models/roles.js");
require("dotenv").config();

const defaultColor = process.env.DEFAULT_COLOR;

module.exports = {
  id: "experience_delete_selectMenu",
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const guildRoles = await Roles.findOne({ guildId: interaction.guild.id });
    const experience = interaction.values[0];

    const rolesWithExperience = guildRoles.roles.filter((role) =>
      role.hourlySalary.has(experience)
    );
    if (rolesWithExperience.length > 0) {
      let roles = "";
      for (role of rolesWithExperience) {
        roles += `- ${role.name}\n`;
      }

      const conflict = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Role conflicts")
        .setDescription(
          "Please remove that experience from the following roles with the `/rolelist` command, then try again.\n\n" +
            roles
        );

      return interaction.editReply({ embeds: [conflict] });
    }

    let indexToRemove = guildRoles.experiences.indexOf(experience);
    guildRoles.experiences.splice(indexToRemove, 1);
    await guildRoles.save();

    const embed = new EmbedBuilder()
      .setColor(defaultColor)
      .setDescription(
        "<:trashcheck:1256347980659818648> I has successfully deleted the `" +
          experience +
          "` experience for you."
      );

    interaction.editReply({ embeds: [embed] });
  },
};
