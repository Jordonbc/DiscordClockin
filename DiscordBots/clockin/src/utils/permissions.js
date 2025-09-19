const { PermissionFlagsBits } = require("discord.js");
const { resolveRoleCollection } = require("./interactions");

function isPrivilegedMember(interaction, settings) {
  if (!interaction || typeof interaction.inGuild !== "function" || !interaction.inGuild()) {
    return false;
  }

  const memberPermissions = interaction.memberPermissions || interaction.member?.permissions;
  if (memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const adminRoles = Array.isArray(settings?.bot_admin_role) ? settings.bot_admin_role : [];
  if (adminRoles.length === 0) {
    return false;
  }

  const roleCollection = resolveRoleCollection(interaction.member);
  if (!roleCollection) {
    return false;
  }

  return roleCollection.some((role) => adminRoles.includes(role.id));
}

module.exports = {
  isPrivilegedMember,
};
