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
    .setName("timesheet")
    .setDescription("Generate reports using the backend API")
    .addSubcommand((sub) =>
      sub
        .setName("summary")
        .setDescription("Show a worker's hour summary")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Worker to inspect (defaults to you)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("sessions")
        .setDescription("List the most recent work sessions")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Worker to inspect (defaults to you)")
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("count")
            .setDescription("Number of sessions to display (default 5)")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("payroll")
        .setDescription("Estimate payroll totals for a worker")
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
      console.log("Report Segritude commands registered for guild", GUILD_ID);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Report Segritude commands registered globally");
    }
  } catch (error) {
    console.error("Failed to register Report Segritude commands", error);
  }

  console.log(`Report Segritude ready as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "timesheet") {
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
  const target = interaction.options.getUser("user") || interaction.user;

  try {
    const data = await api.getTimesheet({ guildId, userId: target.id });

    if (subcommand === "summary") {
      await interaction.reply({
        embeds: [buildSummaryEmbed(target, data)],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "sessions") {
      const count = interaction.options.getInteger("count") || 5;
      await interaction.reply({
        embeds: [buildSessionsEmbed(target, data, count)],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "payroll") {
      await interaction.reply({
        embeds: [buildPayrollEmbed(target, data)],
        ephemeral: true,
      });
    }
  } catch (error) {
    await handleError(interaction, error);
  }
});

function buildSummaryEmbed(user, data) {
  return new EmbedBuilder()
    .setTitle(`Timesheet summary for ${user.username}`)
    .setDescription(`Current status: **${data.worker.status}**`)
    .addFields(
      { name: "Daily hours", value: data.metrics.daily_hours.toFixed(2), inline: true },
      { name: "Weekly hours", value: data.metrics.weekly_hours.toFixed(2), inline: true },
      { name: "Total hours", value: data.metrics.total_hours.toFixed(2), inline: true },
      { name: "Break hours", value: data.metrics.break_hours.toFixed(2), inline: true },
      {
        name: "Active session",
        value: data.active_session
          ? `${data.active_session.duration_minutes.toFixed(0)} minutes so far (started ${time(
              Math.round(data.active_session.started_at_ms / 1000)
            )})`
          : "No active session",
        inline: false,
      }
    )
    .setTimestamp(new Date());
}

function buildSessionsEmbed(user, data, count) {
  const embed = new EmbedBuilder()
    .setTitle(`Recent sessions for ${user.username}`)
    .setDescription(`Showing the last ${count} entries (if available).`)
    .setTimestamp(new Date());

  if (!Array.isArray(data.sessions) || data.sessions.length === 0) {
    embed.addFields({ name: "Sessions", value: "No sessions recorded." });
    return embed;
  }

  const lines = data.sessions
    .slice(-count)
    .reverse()
    .map((session, index) => {
      const start = time(Math.round(session.started_at_ms / 1000));
      if (session.ended_at_ms) {
        const end = time(Math.round(session.ended_at_ms / 1000));
        return `${index + 1}. ${start} → ${end} (${session.duration_minutes.toFixed(0)}m)`;
      }
      return `${index + 1}. ${start} → ongoing (${session.duration_minutes.toFixed(0)}m)`;
    });

  embed.addFields({ name: "Sessions", value: lines.join("\n") });
  return embed;
}

function buildPayrollEmbed(user, data) {
  const embed = new EmbedBuilder()
    .setTitle(`Payroll estimate for ${user.username}`)
    .setTimestamp(new Date());

  if (!data.payroll) {
    embed.setDescription("No payroll configuration found for this worker.");
    embed.addFields({ name: "Status", value: data.worker.status, inline: true });
    return embed;
  }

  embed
    .setDescription(`Role: **${data.worker.role_id}**`)
    .addFields(
      { name: "Experience", value: data.worker.experience || "Not set", inline: true },
      { name: "Hourly rate", value: `$${data.payroll.hourly_rate.toFixed(2)}`, inline: true },
      {
        name: "Projected weekly pay",
        value: `$${data.payroll.projected_weekly_pay.toFixed(2)}`,
        inline: true,
      },
      {
        name: "Projected total pay",
        value: `$${data.payroll.projected_total_pay.toFixed(2)}`,
        inline: true,
      },
      { name: "Total hours", value: data.metrics.total_hours.toFixed(2), inline: true }
    );

  return embed;
}

async function handleError(interaction, error) {
  console.error("Timesheet command failed", error);

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
