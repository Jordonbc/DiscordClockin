const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  EmbedBuilder,
  time,
} = require("discord.js");
const { createErrorEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");

const DEFAULT_DM_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

module.exports = {
  data: new SlashCommandBuilder()
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
  async execute(interaction, { api }) {
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
        await handleBreak(interaction, api, guildId, subcommand);
        return;
      }

      switch (subcommand) {
        case "in":
          await handleClockIn(interaction, api, guildId);
          break;
        case "out":
          await handleClockOut(interaction, api, guildId);
          break;
        case "status":
          await handleStatus(interaction, api, guildId);
          break;
        default:
          await interaction.reply({
            content: "Unsupported subcommand.",
            ephemeral: true,
          });
      }
    } catch (error) {
      await replyWithApiError(interaction, error);
    }
  },
};

async function handleBreak(interaction, api, guildId, subcommand) {
  if (subcommand === "start") {
    await api.startBreak({ guildId, userId: interaction.user.id });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("clock_break_end")
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Return to work"),
      new ButtonBuilder()
        .setCustomId("clock_out")
        .setStyle(ButtonStyle.Danger)
        .setLabel("Clock out")
    );

    await interaction.reply({
      content: "Enjoy your break!",
      components: [row],
      ephemeral: true,
    });
    const guildName = interaction.guild?.name || "this server";
    const dmEmbed = new EmbedBuilder()
      .setColor(DEFAULT_DM_COLOR)
      .setTitle("Break started")
      .setDescription(
        `Your break is running for **${guildName}**. I'll ping you here so you remember to head back.`
      )
      .addFields({
        name: "When you're ready",
        value: "Use `/clock break end` or return to the clock-in post in the server to resume work.",
      });
    await notifyUserDm(interaction, { embeds: [dmEmbed] });
    return;
  }

  if (subcommand === "end") {
    await api.endBreak({ guildId, userId: interaction.user.id });
    const row = buildWorkControlsRow();

    await interaction.reply({
      content: "Welcome back! Break ended successfully.",
      components: [row],
      ephemeral: true,
    });
    const guildName = interaction.guild?.name || "this server";
    const dmEmbed = new EmbedBuilder()
      .setColor(DEFAULT_DM_COLOR)
      .setTitle("Break ended")
      .setDescription(`You're back on the clock for **${guildName}**. Let's get back to it!`);
    await notifyUserDm(interaction, { embeds: [dmEmbed] });
    return;
  }

  await interaction.reply({
    content: "Unsupported break subcommand.",
    ephemeral: true,
  });
}

async function handleClockIn(interaction, api, guildId) {
  const response = await api.startShift({
    guildId,
    userId: interaction.user.id,
    clockInMessageId: interaction.channelId,
  });

  const row = buildWorkControlsRow();

  await interaction.reply({
    embeds: [buildShiftEmbed("Clocked in", response.worker)],
    components: [row],
    ephemeral: true,
  });

  const guildName = interaction.guild?.name || "this server";
  const dmEmbed = new EmbedBuilder()
    .setColor(DEFAULT_DM_COLOR)
    .setTitle("Clocked in")
    .setDescription(
      `You're now clocked in for **${guildName}**. I'll keep you posted here until it's time to wrap up.`
    )
    .addFields({
      name: "Need to pause?",
      value: "Use `/clock break start` or the buttons in the clock-in post when you're in the server.",
    });
  await notifyUserDm(interaction, { embeds: [dmEmbed] });
}

async function handleClockOut(interaction, api, guildId) {
  const response = await api.endShift({
    guildId,
    userId: interaction.user.id,
  });

  await interaction.reply({
    embeds: [buildShiftEmbed("Clocked out", response.worker)],
    ephemeral: true,
  });

  const guildName = interaction.guild?.name || "this server";
  const dmEmbed = new EmbedBuilder()
    .setColor(DEFAULT_DM_COLOR)
    .setTitle("Clocked out")
    .setDescription(`You're clocked out from **${guildName}**. Nice work today!`)
    .addFields({
      name: "Hours logged",
      value: `${response.worker.total_worked_hours.toFixed(2)}h total so far.`,
    });
  await notifyUserDm(interaction, { embeds: [dmEmbed] });
}

async function handleStatus(interaction, api, guildId) {
  const data = await api.getTimesheet({
    guildId,
    userId: interaction.user.id,
  });

  await interaction.reply({
    embeds: [buildTimesheetEmbed(interaction.user, data)],
    ephemeral: true,
  });
}

async function replyWithApiError(interaction, error) {
  const embed = createErrorEmbed(error);

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [embed], ephemeral: true });
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

function buildWorkControlsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("clock_break")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Take a break"),
    new ButtonBuilder()
      .setCustomId("clock_out")
      .setStyle(ButtonStyle.Danger)
      .setLabel("Clock out")
  );
}
