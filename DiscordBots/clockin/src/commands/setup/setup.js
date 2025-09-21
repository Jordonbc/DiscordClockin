const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  AttachmentBuilder,
} = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");
const { buildMainClockEmbed } = require("../../views/setupEmbeds");
const { buildMainClockSelectRow } = require("../../views/mainClockSelectMenu");
const path = require("path");
const fs = require("fs");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#81e6ff";
const TARGET_GUILD_ID = process.env.GUILD_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Send the clock-in message in the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction, { api, client }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const settingsPayload = await api.getSettings({
        guildId: interaction.guildId,
      });
      const settings = settingsPayload?.settings;

      if (!settings?.plan) {
        const embed = createPlanRequiredEmbed();
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const { embed: bannerEmbed, attachments } = await buildBannerEmbed(
        client,
        interaction.guildId
      );
      const embedMain = buildMainClockEmbed({
        color: DEFAULT_COLOR,
        guildId: interaction.guildId,
        targetGuildId: TARGET_GUILD_ID,
      });

      await interaction.channel.send({
        embeds: [bannerEmbed, embedMain],
        components: [buildMainClockSelectRow({ guildId: interaction.guildId })],
        files: attachments,
      });

      await interaction.editReply({
        content: "✅ **Setup message has been sent!**",
      });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

function createPlanRequiredEmbed() {
  return new EmbedBuilder()
    .setColor("Red")
    .setDescription(
      "🚫 This server does not have an active plan configured. Set a plan with `/setplan` before using the setup command."
    );
}

async function buildBannerEmbed(client, guildId) {
  const attachments = [];
  const isTargetGuild = TARGET_GUILD_ID && guildId === TARGET_GUILD_ID;
  const localFileName = isTargetGuild
    ? "banner_clockedIn_segritude.PNG"
    : "banner_clockedIn.png";
  const localPath = path.join(__dirname, "..", "..", "..", localFileName);

  if (fs.existsSync(localPath)) {
    const attachmentName = isTargetGuild
      ? "segritude_clockin_banner.png"
      : "clockin_banner.png";
    attachments.push(
      new AttachmentBuilder(localPath, { name: attachmentName })
    );

    return {
      embed: new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setImage(`attachment://${attachmentName}`),
      attachments,
    };
  }

  try {
    const user = await client.users.fetch(client.user.id, { force: true });
    const bannerURL =
      user.bannerURL({ format: "png", size: 1024 }) ||
      "https://i.imgur.com/abKnqEb.jpeg";

    return {
      embed: new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setImage(bannerURL),
      attachments,
    };
  } catch (error) {
    console.warn("Failed to fetch bot banner", error);
    return {
      embed: new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setImage("https://i.imgur.com/abKnqEb.jpeg"),
      attachments,
    };
  }
}
