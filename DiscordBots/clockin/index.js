require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  Routes,
  REST,
  Collection,
} = require("discord.js");
const { ApiClient } = require("./src/apiClient");

const DISCORD_TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const BACKEND_API_URL = process.env.BACKEND_API_URL;

if (!DISCORD_TOKEN) {
  throw new Error("TOKEN is required");
}

if (!CLIENT_ID) {
  throw new Error("CLIENT_ID is required to register slash commands");
}

if (!BACKEND_API_URL) {
  throw new Error("BACKEND_API_URL is required to contact the backend API");
}

const api = new ApiClient(BACKEND_API_URL, { timeoutMs: 15000 });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();
client.api = api;

const slashCommandData = loadSlashCommands(client.commands);
loadComponentHandlers(client, "buttons", client.buttons);
loadComponentHandlers(client, "selectMenus", client.selectMenus);
loadComponentHandlers(client, "modals", client.modals);

client.once("ready", async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    const body = slashCommandData.map((command) => command.toJSON());

    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body }
      );
      console.log("Registered guild commands for clock bot");
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
      console.log("Registered global commands for clock bot");
    }
  } catch (error) {
    console.error("Failed to register application commands", error);
  }

  console.log(`Clock bot ready as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleComponentInteraction(client.buttons, interaction);
      return;
    }

    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isRoleSelectMenu()) {
      await handleComponentInteraction(client.selectMenus, interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleComponentInteraction(client.modals, interaction);
      return;
    }
  } catch (error) {
    console.error("Interaction handler failed", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: "Something went wrong while processing that interaction.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "Something went wrong while processing that interaction.",
        ephemeral: true,
      });
    }
  }
});

client.login(DISCORD_TOKEN);

function loadSlashCommands(collection) {
  const commandsDir = path.join(__dirname, "src", "commands");
  if (!fs.existsSync(commandsDir)) {
    return [];
  }

  const files = walkJsFiles(commandsDir);
  const slashCommands = [];

  for (const file of files) {
    const command = require(file);
    if (!command?.data || typeof command.execute !== "function") {
      console.warn(`Skipped invalid command module at ${file}`);
      continue;
    }

    const name = command.data.name;
    collection.set(name, command);
    slashCommands.push(command.data);
  }

  return slashCommands;
}

function loadComponentHandlers(client, directoryName, collection) {
  const dir = path.join(__dirname, "src", directoryName);
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = walkJsFiles(dir);
  for (const file of files) {
    const handler = require(file);
    if (!handler?.id || typeof handler.execute !== "function") {
      console.warn(`Skipped invalid ${directoryName} module at ${file}`);
      continue;
    }

    collection.set(handler.id, handler);
  }
}

async function handleSlashCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({
      content: "Unknown command.",
      ephemeral: true,
    });
    return;
  }

  await command.execute(interaction, {
    api: interaction.client.api,
    client: interaction.client,
  });
}

async function handleComponentInteraction(collection, interaction) {
  let handler = collection.get(interaction.customId);

  if (!handler) {
    const baseId = interaction.customId.split(":")[0];
    handler = collection.get(baseId);
  }

  if (!handler) {
    return;
  }

  await handler.execute(interaction, {
    api: interaction.client.api,
    client: interaction.client,
  });
}

function walkJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}
