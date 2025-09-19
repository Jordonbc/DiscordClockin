const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#00FF00";

function buildSetupStatusView({ guild, settings, roles }) {
  const embed = new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setTitle("Current setup status")
    .setFooter({
      text: `${guild.name} - ${settings?.plan || "No plan"}`,
      iconURL: guild.iconURL() || undefined,
    })
    .addFields(
      {
        name: "Target hours",
        value: formatNumber(settings?.target_hours, "hours"),
        inline: true,
      },
      {
        name: "Max AFK hours",
        value: formatNumber(settings?.max_afk_hours, "hours"),
        inline: true,
      },
      {
        name: "AFK reminders",
        value: formatNumber(settings?.afk_reminders, "hours"),
        inline: true,
      },
      {
        name: "Log channel",
        value: formatChannel(settings?.log_channel_id),
        inline: true,
      },
      {
        name: "Weekly report channel",
        value: formatChannel(settings?.weekly_report_channel_id),
        inline: true,
      },
      {
        name: "Timezone",
        value: settings?.time_zone || "None",
        inline: true,
      },
      {
        name: "Worker voice chats",
        value: formatList(settings?.worker_voice_chats, (id) => `<#${id}>`),
        inline: false,
      },
      {
        name: "Bot admin roles",
        value: formatList(settings?.bot_admin_role, (id) => `<@&${id}>`),
        inline: true,
      },
      {
        name: "Voice exempt roles",
        value: formatList(settings?.voice_exempt_role, (id) => `<@&${id}>`),
        inline: true,
      },
      {
        name: "Weekly exempt role",
        value: settings?.weekly_exempt_role ? `<@&${settings.weekly_exempt_role}>` : "None",
        inline: true,
      },
      {
        name: "Configured roles",
        value: rolesSummary(roles?.roles || []),
        inline: false,
      }
    );

  const primaryRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup_targetTime_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Target hours"),
    new ButtonBuilder()
      .setCustomId("setup_afkReminder_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("AFK reminders"),
    new ButtonBuilder()
      .setCustomId("setup_log_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Log channel"),
    new ButtonBuilder()
      .setCustomId("setup_weeklyReport_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Weekly report"),
    new ButtonBuilder()
      .setCustomId("setup_workerVoiceChats_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Worker voice chats")
  );

  const secondaryRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup_adminRole_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Bot admin roles"),
    new ButtonBuilder()
      .setCustomId("setup_voiceExemptRole_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Voice exempt roles"),
    new ButtonBuilder()
      .setCustomId("setup_weeklyExemptRole_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Weekly exempt role"),
    new ButtonBuilder()
      .setCustomId("setup_timeZone_button")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Timezone")
  );

  return {
    embeds: [embed],
    components: [primaryRow, secondaryRow],
  };
}

function formatNumber(value, suffix) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return `${value} ${suffix}`;
  }
  return "None";
}

function formatChannel(id) {
  return id ? `<#${id}>` : "None";
}

function formatList(values, mapFn) {
  if (!Array.isArray(values) || values.length === 0) {
    return "None";
  }
  return values.map(mapFn).join("\n");
}

function rolesSummary(roles) {
  if (!roles.length) {
    return "No roles configured";
  }

  return roles
    .slice(0, 5)
    .map((role) => `• **${role.name}** (${role.id})`)
    .join("\n");
}

module.exports = {
  buildSetupStatusView,
};
