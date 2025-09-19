const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Settings = require("../../models/guildSettings");
const client = require("../..");
const { sendError } = require("../../functions/error");

module.exports = async (client, interaction) => {
  if (!interaction.isButton()) return;

  // const button = client.buttons.get(interaction.customId);
  // Extract the prefix from customId (before the first dash)
  //split the customId by "-" only if there is a "-" in the customId

  const customIdPrefix = interaction.customId.split("-")[0];

  // Find the button that starts with the extracted prefix
  const button = Array.from(client.buttons.values()).find((btn) =>
    btn.id.startsWith(customIdPrefix)
  );
  if (!button) return;

  try {
    // Check if the user has the required permissions
    if (button.permissions) {
      const guildSettings = await Settings.findOne({
        guildId: interaction.guild.id,
      });

      if (
        !interaction.memberPermissions.has(
          PermissionsBitField.resolve(button.permissions || [])
        ) &&
        !interaction.member.roles.cache.has(guildSettings?.botAdminRole)
      ) {
        const perms = new EmbedBuilder()
          .setDescription(
            `🚫 ${interaction.user}, You do not have the role of  \`${button.permissions}\` to use this command!`
          )
          .setColor("Red");
        return interaction.reply({ embeds: [perms], ephemeral: true });
      }
    }

    try {
      await button.run(client, interaction);
    } catch (error) {
      await sendError(client, error, interaction.user);
    }
  } catch (error) {
    console.log("Error in button handler:", error);
  }
};
