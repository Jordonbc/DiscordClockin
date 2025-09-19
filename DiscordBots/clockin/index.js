require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Routes,
  REST,
  SlashCommandBuilder,
  EmbedBuilder,
  time,
} = require("discord.js");
const { ApiClient, ApiError } = require("./src/apiClient");

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

const api = new ApiClient(BACKEND_API_URL, { timeoutMs: 15000 });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

const commands = [
  new SlashCommandBuilder()
    .setName("clock")
    .setDescription("Manage your workday")
    .addSubcommand((sub) =>
      sub.setName("in").setDescription("Clock in and start your shift")
    )
    .addSubcommand((sub) =>
      sub.setName("out").setDescription("Clock out and end your shift")
    )
    .addSubcommandGroup((group) =>
      group
        .setName("break")
        .setDescription("Manage breaks")
        .addSubcommand((sub) =>
          sub.setName("start").setDescription("Start a break")
        )
        .addSubcommand((sub) => sub.setName("end").setDescription("End a break"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View your current timesheet summary")
    ),
  new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register as a worker in the system")
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("Role identifier configured in the backend")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("experience")
        .setDescription("Experience level configured in the backend")
        .setRequired(false)
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
      console.log("Registered guild commands for clock bot");
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Registered global commands for clock bot");
    }
  } catch (error) {
    console.error("Failed to register application commands", error);
  }

  console.log(`Clock bot ready as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === "clock") {
    await handleClockCommand(interaction);
    return;
  }

  if (interaction.commandName === "register") {
    await handleRegisterCommand(interaction);
    return;
  }
});

async function handleClockCommand(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "This command can only be used inside a guild.",
      ephemeral: true,
    });
    return;
  }

  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand(false);

  try {
    if (subcommandGroup === "break") {
      if (subcommand === "start") {
        await api.startBreak({ guildId, userId: interaction.user.id });
        await interaction.reply({
          content: "Enjoy your break!",
          ephemeral: true,
        });
      } else if (subcommand === "end") {
        await api.endBreak({ guildId, userId: interaction.user.id });
        await interaction.reply({
          content: "Welcome back! Break ended successfully.",
          ephemeral: true,
        });
      }
      return;
    }

    switch (subcommand) {
      case "in": {
        const response = await api.startShift({
          guildId,
          userId: interaction.user.id,
          clockInMessageId: interaction.channelId,
        });
        await interaction.reply({
          embeds: [buildShiftEmbed("Clocked in", response.worker)],
          ephemeral: true,
        });
        break;
      }
      case "out": {
        const response = await api.endShift({
          guildId,
          userId: interaction.user.id,
        });
        await interaction.reply({
          embeds: [buildShiftEmbed("Clocked out", response.worker)],
          ephemeral: true,
        });
        break;
      }
      case "status": {
        const data = await api.getTimesheet({
          guildId,
          userId: interaction.user.id,
        });
        await interaction.reply({
          embeds: [buildTimesheetEmbed(interaction.user, data)],
          ephemeral: true,
        });
        break;
      }
      default: {
        await interaction.reply({
          content: "Unsupported subcommand.",
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    await handleError(interaction, error);
  }
}

async function handleRegisterCommand(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "This command can only be used inside a guild.",
      ephemeral: true,
    });
    return;
  }

  const roleId = interaction.options.getString("role", true);
  const experience = interaction.options.getString("experience", false) || undefined;

  try {
    const response = await api.registerWorker({
      guildId,
      userId: interaction.user.id,
      roleId,
      experience,
    });

    await interaction.reply({
      embeds: [buildWorkerEmbed(interaction.user, response.worker)],
      ephemeral: true,
    });
  } catch (error) {
    await handleError(interaction, error);
  }
}

function buildShiftEmbed(title, worker) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`Status: **${worker.status}**`)
    .addFields(
      { name: "Breaks taken", value: `${worker.breaks_count}`, inline: true },
      {
        name: "Break hours",
        value: worker.break_time_hours.toFixed(2),
        inline: true,
      },
      {
        name: "Total worked hours",
        value: worker.total_worked_hours.toFixed(2),
        inline: true,
      }
    )
    .setTimestamp(new Date());
}

function buildWorkerEmbed(user, worker) {
  const experienceText = worker.experience ? worker.experience : "Not set";
  return new EmbedBuilder()
    .setTitle("Worker registered")
    .setDescription(`${user} is ready to start working!`)
    .addFields(
      { name: "Role", value: worker.role_id, inline: true },
      { name: "Experience", value: experienceText, inline: true },
      { name: "Status", value: worker.status, inline: true }
    )
    .setTimestamp(new Date());
}

function buildTimesheetEmbed(user, data) {
  const embed = new EmbedBuilder()
    .setTitle(`${user.username}'s timesheet`)
    .setDescription(`Status: **${data.worker.status}**`)
    .addFields(
      {
        name: "Daily hours",
        value: data.metrics.daily_hours.toFixed(2),
        inline: true,
      },
      {
        name: "Weekly hours",
        value: data.metrics.weekly_hours.toFixed(2),
        inline: true,
      },
      {
        name: "Total hours",
        value: data.metrics.total_hours.toFixed(2),
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
    const recentSessions = data.sessions.slice(-3).reverse();
    const value = recentSessions
      .map((session) => {
        if (session.ended_at_ms) {
          return `• ${time(
            Math.round(session.started_at_ms / 1000)
          )} → ${time(Math.round(session.ended_at_ms / 1000))} (${session.duration_minutes.toFixed(
            0
          )}m)`;
        }
        return `• ${time(
          Math.round(session.started_at_ms / 1000)
        )} → ongoing (${session.duration_minutes.toFixed(0)}m)`;
      })
      .join("\n");

    embed.addFields({
      name: "Recent sessions",
      value,
    });
  }

  if (data.payroll) {
    embed.addFields({
      name: "Projected pay",
      value: `Hourly: $${data.payroll.hourly_rate.toFixed(2)}\nWeekly: $${data.payroll.projected_weekly_pay.toFixed(2)}\nTotal: $${data.payroll.projected_total_pay.toFixed(2)}`,
    });
  }

  return embed;
}

async function handleError(interaction, error) {
  console.error("Clock bot command failed", error);

  const message = error instanceof ApiError ? error.message : "Something went wrong while contacting the backend.";
  await interaction.reply({
    content: message,
    ephemeral: true,
  });
}

client.login(DISCORD_TOKEN);
