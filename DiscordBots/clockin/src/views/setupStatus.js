const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#5865F2";
const BRAND_FOOTER = process.env.BOT_CREDITS || "Clockin Workforce Tools";

function buildSetupStatusView({ guild, settings, rolesView }) {
  const roles = Array.isArray(rolesView?.roles) ? rolesView.roles : [];
  const experiences = Array.isArray(rolesView?.experiences)
    ? rolesView.experiences
    : [];

  const planLabel = settings?.plan ? capitalize(settings.plan) : "No plan";
  const guildIcon = guild?.iconURL?.({ size: 256 }) || undefined;

  const embed = new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setAuthor({
      name: `${guild?.name || "Server"} • Setup overview`,
      iconURL: guildIcon,
    })
    .setTitle("» Current setup status")
    .setDescription(
      "Here's a snapshot of how Clockin is configured right now. Use the buttons below to keep everything up to date."
    )
    .addFields(
      {
        name: ".icon_bullseye › Target hours",
        value: formatNumber(settings?.target_hours, "hours"),
        inline: true,
      },
      {
        name: ".icon_afk_max › Max AFK hours",
        value: formatNumber(settings?.max_afk_hours, "hours"),
        inline: true,
      },
      {
        name: ".icon_afk_bell › AFK reminders",
        value: formatNumber(settings?.afk_reminders, "hours"),
        inline: true,
      },
      {
        name: "#log › Log channel",
        value: formatChannel(settings?.log_channel_id),
        inline: true,
      },
      {
        name: "#weekly › Weekly reports",
        value: formatChannel(settings?.weekly_report_channel_id),
        inline: true,
      },
      {
        name: ".icon_timezone › Timezone",
        value: settings?.time_zone || "None",
        inline: true,
      },
      {
        name: ".icon_voice › Worker voice chats",
        value: formatList(settings?.worker_voice_chats, (id) => `<#${id}>`),
      },
      {
        name: ".icon_admin › Bot admin roles",
        value: formatList(settings?.bot_admin_role, (id) => `<@&${id}>`),
        inline: true,
      },
      {
        name: ".icon_voice_shield › Voice exempt roles",
        value: formatList(settings?.voice_exempt_role, (id) => `<@&${id}>`),
        inline: true,
      },
      {
        name: ".icon_weekly_exempt › Weekly exempt role",
        value: settings?.weekly_exempt_role ? `<@&${settings.weekly_exempt_role}>` : "None",
        inline: true,
      },
      {
        name: ".icon_roles › Configured roles",
        value: rolesSummary(roles),
      },
      {
        name: ".icon_experience › Experiences",
        value: experiences.length ? experiences.join("\n") : "None",
      }
    )
    .setFooter({ text: `${BRAND_FOOTER} • ${planLabel}` });

  if (guildIcon) {
    embed.setThumbnail(guildIcon);
  }

  const primaryRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup_targetTime_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🎯")
      .setLabel("Target hours"),
    new ButtonBuilder()
      .setCustomId("setup_afkReminder_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏰")
      .setLabel("AFK reminders"),
    new ButtonBuilder()
      .setCustomId("setup_log_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🗒️")
      .setLabel("Log channel"),
    new ButtonBuilder()
      .setCustomId("setup_weeklyReport_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📊")
      .setLabel("Weekly report"),
    new ButtonBuilder()
      .setCustomId("setup_workerVoiceChats_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔊")
      .setLabel("Worker voice chats")
  );

  const secondaryRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup_adminRole_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🛡️")
      .setLabel("Bot admin roles"),
    new ButtonBuilder()
      .setCustomId("setup_voiceExemptRole_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔕")
      .setLabel("Voice exempt roles"),
    new ButtonBuilder()
      .setCustomId("setup_weeklyExemptRole_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📤")
      .setLabel("Weekly exempt"),
    new ButtonBuilder()
      .setCustomId("setup_timeZone_button")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🌍")
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
    .map((role) => `• **${role.name}** — <@&${role.role_id || role.id}>`)
    .join("\n");
}

function capitalize(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

module.exports = {
  buildSetupStatusView,
};
