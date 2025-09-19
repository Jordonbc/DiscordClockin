const { EmbedBuilder, PermissionsBitField, codeBlock } = require("discord.js");
const client = require("../../index.js");
const Settings = require("../../models/guildSettings.js");
const { sendError } = require("../../functions/error.js");

module.exports = async (client, interaction) => {
  if (!interaction.isModalSubmit()) return;

  const modal = client.modals.get(interaction.customId);
  if (!modal) return;

  try {
    if (modal.permissions) {
      const guildSettings = await Settings.findOne({
        guildId: interaction.guild.id,
      });
      if (
        !interaction.memberPermissions.has(
          PermissionsBitField.resolve(modal.permissions || [])
        ) &&
        !interaction.member.roles.has(guildSettings?.botAdminRole)
      ) {
        const perms = new EmbedBuilder()
          .setDescription(
            `🚫 ${interaction.user}, Dazu fehlt dir das Recht \`${modal.permissions}\` um den Command zu nutzen!`
          )
          .setColor("Red");
        return interaction.reply({ embeds: [perms], ephemeral: true });
      }
    }
    try {
      await modal.run(client, interaction);
    } catch (error) {
      await sendError(client, error, interaction.user);
    }
  } catch (error) {
    console.log(error);
  }
};
