//Sequentially for all guilds
const path = require("path");
const chalk = require("chalk");
require("dotenv").config();

const { PermissionsBitField, REST, Routes } = require("discord.js");

const AsciiTable = require("ascii-table");
const table = new AsciiTable()
  .setHeading("Slash Commands", "Stats")
  .setBorder("|", "=", "0", "0");

const getAllFiles = require("../../utils/getAllFiles");

module.exports = async (client) => {
  const TOKEN = process.env.TOKEN;
  const CLIENT_ID = process.env.CLIENT_ID;

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const slashCommands = [];
  const commandFiles = [];
  const commandCategories = getAllFiles(
    path.join(__dirname, "../../", "publicSlashCommands"),
    true
  );

  // Populate the slashCommands array with command data
  try {
    for (const categoryPath of commandCategories) {
      const categoryName = path.basename(categoryPath);
      const files = getAllFiles(categoryPath).filter((file) =>
        file.endsWith(".js")
      );

      for (const filePath of files) {
        const file = path.basename(filePath);
        const slashCommand = require(filePath);
        commandFiles.push({ dir: categoryName, file, slashCommand });

        slashCommands.push({
          name: slashCommand.name,
          description: slashCommand.description,
          type: slashCommand.type,
          options: slashCommand.options ? slashCommand.options : null,
          dm_permission: !slashCommand.guildOnly,
          default_permission: slashCommand.default_permission
            ? slashCommand.default_permission
            : null,
          default_member_permissions: slashCommand.default_member_permissions
            ? PermissionsBitField.resolve(
                slashCommand.default_member_permissions
              ).toString()
            : null,
        });

        if (slashCommand.name) {
          client.slashCommands.set(slashCommand.name, slashCommand);
          table.addRow(file.split(".js")[0], "✅");
        } else {
          table.addRow(file.split(".js")[0], "⛔");
        }
      }
    }
  } catch (error) {
    console.log(chalk.red("Error loading local slash commands:"), error);
  }
  console.log(chalk.green(table.toString()));

  try {
    // Register global commands for the bot using the slash commands array and the rest API
    console.log(
      chalk.blue("🔄 Started refreshing global application (/) commands.")
    );

    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: slashCommands,
    });

    console.log(
      chalk.green("✅ Successfully reloaded global application (/) commands.")
    );
  } catch (error) {
    console.log(chalk.red("Error processing commands:"), error);
  }
};
