const { Collection } = require("discord.js");

function getGuildIdFromInteraction(interaction) {
  if (interaction?.guildId) {
    return interaction.guildId;
  }

  if (typeof interaction?.customId === "string") {
    const parts = interaction.customId.split(":");
    if (parts.length > 1 && parts[1]) {
      return parts[1];
    }
  }

  return null;
}

async function resolveGuildName(interaction, guildId) {
  if (!guildId) {
    return "this server";
  }

  if (interaction?.guild && interaction.guild.id === guildId && interaction.guild.name) {
    return interaction.guild.name;
  }

  const cached = interaction?.client?.guilds?.cache?.get(guildId);
  if (cached?.name) {
    return cached.name;
  }

  try {
    const guild = await interaction?.client?.guilds?.fetch?.(guildId);
    if (guild?.name) {
      return guild.name;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`Failed to fetch guild ${guildId} name`, error);
    }
  }

  return "this server";
}

function resolveRoleCollection(member) {
  const roles = member?.roles;
  if (!roles) {
    return null;
  }

  if (roles instanceof Collection) {
    return roles;
  }

  if (roles.cache instanceof Collection) {
    return roles.cache;
  }

  return null;
}

module.exports = {
  getGuildIdFromInteraction,
  resolveGuildName,
  resolveRoleCollection,
};
