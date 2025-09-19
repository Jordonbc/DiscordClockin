const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  version: discordJsVersion,
} = require("discord.js");
const { applyInteractionBranding } = require("../../utils/embeds");
const pkg = require("../../../package.json");

const SUPPORT_SERVER_URL = process.env.SUPPORT_SERVER_URL;

module.exports = {
  data: new SlashCommandBuilder().setName("bot-info").setDescription("Display bot information"),
  async execute(interaction, { api }) {
    const client = interaction.client;

    const [workerSummary, inviteUrl] = await Promise.all([
      fetchWorkerSummary(api, interaction.guildId),
      resolveInviteUrl(client),
    ]);

    const botAvatar = typeof client.user?.displayAvatarURL === "function"
      ? client.user.displayAvatarURL({ size: 256 })
      : null;

    const embed = new EmbedBuilder()
      .setTitle("» BOT INFO")
      .setDescription("Here you find all information about the bot.")
      .addFields(
        {
          name: "Bot version",
          value: `v${pkg.version}`,
          inline: true,
        },
        {
          name: "discord.js version",
          value: `v${discordJsVersion}`,
          inline: true,
        },
        {
          name: "Uptime",
          value: formatDuration(client.uptime),
          inline: true,
        },
        {
          name: "Servers",
          value: `${client.guilds.cache.size.toLocaleString()}`,
          inline: true,
        },
        {
          name: "Verified workers",
          value: workerSummary,
          inline: true,
        },
        {
          name: "Invite link",
          value: inviteUrl ? `[📎 Click here](${inviteUrl})` : "Not configured",
          inline: true,
        },
        {
          name: "Support server",
          value: SUPPORT_SERVER_URL ? `[📎 Click here](${SUPPORT_SERVER_URL})` : "Not configured",
          inline: true,
        }
      );

    if (botAvatar) {
      embed.setThumbnail(botAvatar);
    }

    applyInteractionBranding(embed, interaction, { accentEmoji: "🤖" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

function formatDuration(ms) {
  if (!ms) return "N/A";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours % 24) parts.push(`${hours % 24}h`);
  if (minutes % 60) parts.push(`${minutes % 60}m`);
  if (seconds % 60) parts.push(`${seconds % 60}s`);

  return parts.join(" ") || `${seconds}s`;
}

async function fetchWorkerSummary(api, guildId) {
  if (!api || !guildId) {
    return "Unavailable";
  }

  try {
    const response = await api.listWorkers({ guildId });
    const workers = Array.isArray(response?.workers) ? response.workers : [];
    return `${workers.length.toLocaleString()}`;
  } catch (error) {
    return "Unavailable";
  }
}

async function resolveInviteUrl(client) {
  if (!client?.user) {
    return null;
  }

  if (process.env.BOT_INVITE_URL) {
    return process.env.BOT_INVITE_URL;
  }

  try {
    return await client.generateInvite({
      scopes: ["bot", "applications.commands"],
      permissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.ViewChannel,
      ],
    });
  } catch (error) {
    return null;
  }
}
