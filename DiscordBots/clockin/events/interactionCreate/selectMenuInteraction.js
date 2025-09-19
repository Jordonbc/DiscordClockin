const {
  EmbedBuilder,
  PermissionsBitField,
  codeBlock,
  MessageFlags,
} = require("discord.js");
const client = require("../../index.js");
const Settings = require("../../models/guildSettings.js");
const { sendError } = require("../../functions/error.js");

module.exports = async (client, interaction) => {
  if (!interaction.isAnySelectMenu()) return;

  // const selectMenus = client.selectMenus.get(interaction.customId);
  // Extract the prefix from customId (before the first dash)
  const customIdPrefix = interaction.customId.split("-")[0];

  // Find the select menu that starts with the extracted prefix
  const selectMenus = Array.from(client.selectMenus.values()).find((menu) =>
    menu.id.startsWith(customIdPrefix)
  );

  if (!selectMenus) return;

  try {
    if (selectMenus.permissions) {
      const guildSettings = await Settings.findOne({
        guildId: interaction.guild.id,
      });
      if (
        !interaction.memberPermissions.has(
          PermissionsBitField.resolve(selectMenus.permissions || [])
        ) &&
        !interaction.member.roles.has(guildSettings?.botAdminRole)
      ) {
        const perms = new EmbedBuilder()
          .setDescription(
            `🚫 ${interaction.user}, You do not have \`${modal.permissions}\` to use this command!`
          )
          .setColor("Red");
        return interaction.reply({
          embeds: [perms],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    try {
      await selectMenus.run(client, interaction);
    } catch (error) {
      await sendError(client, error, interaction.user);
    }
  } catch (error) {
    console.log(error);
  }
};
