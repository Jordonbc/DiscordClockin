const { REST, Routes, PermissionsBitField } = require("discord.js");
const areCommandsDifferent = require("../../utils/areCommandsDifferent");
const getApplicationCommands = require("../../utils/getApplicationCommands");
const getLocalCommands = require("../../utils/getLocalCommands");
require("dotenv").config();

module.exports = async (client) => {
  const GUILD_ID = process.env.GUILD_ID;
  const TOKEN = process.env.TOKEN;
  const CLIENT_ID = process.env.CLIENT_ID;

  try {
    const localCommands = getLocalCommands([], "slashCommands");

    // Restructure local commands for Discord API
    const structuredCommands = localCommands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      type: cmd.type,
      options: cmd.options || [],
      default_member_permissions: cmd.default_member_permissions
        ? PermissionsBitField.resolve(cmd.default_member_permissions).toString()
        : null,
    }));

    console.log("🔄 Started refreshing guild application (/) commands.");

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    // Send commands to Discord API
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: structuredCommands,
    });

    console.log("✅ Successfully reloaded guild application (/) commands.");
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
};
