const { EmbedBuilder } = require("discord.js");
const role = require("../models/roles.js");

// Role Selection Handler
module.exports = {
  id: "new_worker_role_select",
  run: async (client, interaction) => {
    const selectedRole = interaction.values[0];
    const oldEmbed = interaction.message.embeds[0];
    const oldComponents = interaction.message.components;
    let oldDescription = oldEmbed.description;

    // Remove the last "Selected Role: ..." line if it exists
    oldDescription = oldDescription.replace(/Selected Role: .*\n?$/, "");

    // Find the role data
    const guildRoles = await role.findOne({ guildId: interaction.guild.id });
    const roleData = guildRoles.roles.find((r) => r.id === selectedRole);

    const embed = new EmbedBuilder()
      .setTitle(oldEmbed.title)
      .setDescription(`${oldDescription}\nSelected Role: ${roleData.name}`)
      .setColor(oldEmbed.color);

    await interaction.update({
      embeds: [embed],
      components: oldComponents,
    });
  },
};
