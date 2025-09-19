require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  time,
} = require("discord.js");
const { ApiClient, ApiError } = require("./apiClient");
const config = require("../config.json");

const DISCORD_TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || config.clientId;
const GUILD_ID = process.env.GUILD_ID || config.testServer;
const BACKEND_API_URL = process.env.BACKEND_API_URL;

if (!DISCORD_TOKEN) {
  throw new Error("TOKEN is required");
}

if (!CLIENT_ID) {
  throw new Error("CLIENT_ID must be provided via env or config.json");
}

const api = new ApiClient(BACKEND_API_URL, { timeoutMs: 15000 });

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.GuildMember],
});

const commands = [
  new SlashCommandBuilder()
    .setName("availability")
    .setDescription("Check workforce availability from the backend")
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Summarise worker statuses for this guild")
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View a worker's detailed availability")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Worker to inspect (defaults to you)")
            .setRequired(false)
        )
    ),
].map((command) => command.toJSON());

client.once("ready", async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log("Holiday Segritude commands registered for guild", GUILD_ID);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Holiday Segritude commands registered globally");
    }
  } catch (error) {
    console.error("Failed to register Holiday Segritude commands", error);
  }

  console.log(`Holiday Segritude ready as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "availability") {
    return;
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "This command is only available inside a guild.",
      ephemeral: true,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    if (subcommand === "list") {
      const response = await api.listWorkers({ guildId });
      await interaction.reply({
        embeds: [buildAvailabilityEmbed(interaction.guild, response.workers)],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "status") {
      const target = interaction.options.getUser("user") || interaction.user;
      const data = await api.getTimesheet({ guildId, userId: target.id });
      await interaction.reply({
        embeds: [buildWorkerStatusEmbed(target, data)],
        ephemeral: true,
      });
    }
  } catch (error) {
    await handleError(interaction, error);
  }
});

function buildAvailabilityEmbed(guild, workers = []) {
  if (!Array.isArray(workers) || workers.length === 0) {
    return new EmbedBuilder()
      .setTitle("Availability snapshot")
      .setDescription("No workers registered for this guild yet.")
      .setTimestamp(new Date());
  }

  const grouped = workers.reduce((acc, worker) => {
    const status = worker.status || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(`<@${worker.user_id}>`);
    return acc;
  }, {});

  const fields = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([status, users]) => ({
      name: `${status} (${users.length})`,
      value: users.slice(0, 15).join(", ") || "—",
    }));

  const embed = new EmbedBuilder()
    .setTitle(`Availability snapshot for ${guild?.name || "this guild"}`)
    .setDescription(`Backend contains **${workers.length}** registered workers.`)
    .setTimestamp(new Date());

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

function buildWorkerStatusEmbed(user, data) {
  const embed = new EmbedBuilder()
    .setTitle(`Availability for ${user.username}`)
    .setDescription(`Current status: **${data.worker.status}**`)
    .addFields(
      { name: "Breaks taken", value: `${data.worker.breaks_count}`, inline: true },
      {
        name: "Break hours",
        value: data.worker.break_time_hours.toFixed(2),
        inline: true,
      },
      {
        name: "Total hours",
        value: data.worker.total_worked_hours.toFixed(2),
        inline: true,
      }
    )
    .setTimestamp(new Date());

  if (data.active_session) {
    embed.addFields({
      name: "Active session",
      value: `${data.active_session.duration_minutes.toFixed(0)} minutes so far (started ${time(
        Math.round(data.active_session.started_at_ms / 1000)
      )})`,
    });
  }

  if (Array.isArray(data.sessions) && data.sessions.length > 0) {
    const lastSession = data.sessions[data.sessions.length - 1];
    if (lastSession) {
      const duration = lastSession.duration_minutes.toFixed(0);
      if (lastSession.ended_at_ms) {
        embed.addFields({
          name: "Last session",
          value: `${time(Math.round(lastSession.started_at_ms / 1000))} → ${time(
            Math.round(lastSession.ended_at_ms / 1000)
          )} (${duration}m)`,
        });
      } else {
        embed.addFields({
          name: "Last session",
          value: `${time(Math.round(lastSession.started_at_ms / 1000))} → ongoing (${duration}m)`,
        });
      }
    }
  }

  return embed;
}

async function handleError(interaction, error) {
  console.error("Availability command failed", error);

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      content: error instanceof ApiError ? error.message : "Failed to reach the backend service.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: error instanceof ApiError ? error.message : "Failed to reach the backend service.",
    ephemeral: true,
  });
}

client.login(DISCORD_TOKEN);
