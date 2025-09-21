const { SlashCommandBuilder, EmbedBuilder, time } = require("discord.js");
const { createErrorEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");
const { isPrivilegedMember } = require("../utils/permissions");
const {
  buildClockedInView,
  buildOnBreakView,
  buildClockedOutView,
} = require("../views/dmShiftControls");

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
    if (interaction.inGuild()) {
      const settingsPayload = await api.getSettings({ guildId });
      const settings = settingsPayload?.settings;
      if (!isPrivilegedMember(interaction, settings)) {
        await interaction.reply({
          content: "Use the buttons in the DM I sent when you clocked in to manage your breaks.",
          ephemeral: true,
        });
        return;
      }
    }

    const response = await api.startBreak({ guildId, userId: interaction.user.id });

    await interaction.reply({
      content: "Enjoy your break! I've updated your DM controls.",
      ephemeral: true,
    });

    const guildName = interaction.guild?.name || "this server";
    const dmView = buildOnBreakView({
      guildName,
      guildId,
      worker: response?.worker,
    });
    await notifyUserDm(interaction, dmView);
    return;
  }

  if (subcommand === "end") {
    if (interaction.inGuild()) {
      const settingsPayload = await api.getSettings({ guildId });
      const settings = settingsPayload?.settings;
      if (!isPrivilegedMember(interaction, settings)) {
        await interaction.reply({
          content: "Break controls now live in your Clockin DM. Tap **Return to work** there to resume.",
          ephemeral: true,
        });
        return;
      }
    }

    const response = await api.endBreak({ guildId, userId: interaction.user.id });

    await interaction.reply({
      content: "Welcome back! You're clocked in again. I've refreshed your DM controls.",
      ephemeral: true,
    });

    const guildName = interaction.guild?.name || "this server";
    const dmView = buildClockedInView({
      guildName,
      guildId,
      worker: response?.worker,
    });
    await notifyUserDm(interaction, dmView);
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

  await interaction.reply({
    embeds: [
      buildShiftEmbed("Clocked in", response.worker).setFooter({
        text: "DM sent — manage breaks and clock-out from there.",
      }),
    ],
    ephemeral: true,
  });

  const guildName = interaction.guild?.name || "this server";
  const dmView = buildClockedInView({
    guildName,
    guildId,
    worker: response.worker,
  });
  await notifyUserDm(interaction, dmView);
}

async function handleClockOut(interaction, api, guildId) {
  if (interaction.inGuild()) {
    const settingsPayload = await api.getSettings({ guildId });
    const settings = settingsPayload?.settings;
    if (!isPrivilegedMember(interaction, settings)) {
      await interaction.reply({
        content: "Clock out using the red button in the DM I sent you when you started your shift.",
        ephemeral: true,
      });
      return;
    }
  }

  const response = await api.endShift({
    guildId,
    userId: interaction.user.id,
  });

  await interaction.reply({
    embeds: [buildShiftEmbed("Clocked out", response.worker)],
    ephemeral: true,
  });

  const guildName = interaction.guild?.name || "this server";
  const dmView = buildClockedOutView({
    guildName,
    totalWorkedHours: response.worker.total_worked_hours,
  });
  await notifyUserDm(interaction, dmView);
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
