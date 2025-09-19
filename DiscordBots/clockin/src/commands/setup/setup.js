const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");
const { buildMainClockEmbed } = require("../../views/setupEmbeds");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#00FF00";
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
      const settings = await api.getSettings({ guildId: interaction.guildId });
      if (!settings?.plan) {
        const embed = createPlanRequiredEmbed();
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embedImage = await buildBannerEmbed(client);
      const embedMain = buildMainClockEmbed({
        color: DEFAULT_COLOR,
        guildId: interaction.guildId,
        targetGuildId: TARGET_GUILD_ID,
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("mainMsg_selectMenu")
        .setPlaceholder("⭐ › Select an option")
        .addOptions(buildClockSelectOptions(interaction.guildId));

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.channel.send({
        embeds: [embedImage, embedMain],
        components: [row],
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

async function buildBannerEmbed(client) {
  try {
    const user = await client.users.fetch(client.user.id, { force: true });
    const bannerURL = user.bannerURL({ format: "png", size: 1024 }) || "https://i.imgur.com/abKnqEb.jpeg";
    return new EmbedBuilder().setColor(DEFAULT_COLOR).setImage(bannerURL);
  } catch (error) {
    console.warn("Failed to fetch bot banner", error);
    return new EmbedBuilder()
      .setColor(DEFAULT_COLOR)
      .setImage("https://i.imgur.com/abKnqEb.jpeg");
  }
}

function buildClockSelectOptions(guildId) {
  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel("Clock in")
      .setEmoji("<:briefcase:1251845682768117861>")
      .setValue("clockin"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Register")
      .setEmoji("<:form:1340541917712224306>")
      .setValue("register"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Request time off")
      .setEmoji("<:calendarclock:1251845685133836319>")
      .setValue("timeoff"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Emergency leave")
      .setEmoji("<:emergency:1251845682768117861>")
      .setValue("emergency"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Balance")
      .setEmoji("<:sackdollar:1251843223819780156>")
      .setValue("balance"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Report issue")
      .setEmoji("<:warning:1254878169723568209>")
      .setValue("issue"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Send suggestion")
      .setEmoji("<:suggestion:1340542046943051777>")
      .setValue("suggestion"),
  ];

  if (TARGET_GUILD_ID && guildId === TARGET_GUILD_ID) {
    options.splice(5, 0, new StringSelectMenuOptionBuilder()
      .setLabel("Contact HR")
      .setEmoji("<:humanresources:1300921297022357545>")
      .setValue("contacthr"));
  }

  return options;
}
