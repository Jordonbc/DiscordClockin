const {
  EmbedBuilder,
  ActionRowBuilder,
  ApplicationCommandType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require("discord.js");
const Guildsettings = require("../../models/guildSettings.js");
const { planRequired } = require("../../functions/embeds.js");
require("dotenv").config();

const defaultColor = process.env.DEFAULT_COLOR;
const guildId = process.env.GUILD_ID;

module.exports = {
  name: "setup",
  description: "» Sends the clockin embed",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  plan: "Basic",
  guildOnly: true,
  category: "Setup",
  options: [],
  run: async (client, interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Fetch the guild settings
    const guildDB = await Guildsettings.findOne({
      guildId: interaction.guild.id,
    });

    // Check if the guild has a plan
    if (!guildDB?.plan)
      return interaction.editReply({ embeds: [planRequired("Basic")] });

    // Fetch the user object of the bot to get the banner URL
    const user = await client.users.fetch(client.user.id, { force: true });
    const bannerURL =
      user.bannerURL({ format: "png", size: 1024 }) ||
      "https://i.imgur.com/abKnqEb.jpeg"; // Default banner URL

    // Create the image embed
    const embedImage = new EmbedBuilder()
      .setColor(defaultColor)
      .setImage(bannerURL);

    // Create the main clockin embed
    const embedDescription = new EmbedBuilder()
      .setTitle("**Start clocking in to monitor your hours**")
      .setColor(defaultColor)
      .setDescription(
        "Please be adviced abusing the system such as clocking in and not doing any work is breach of contract!\n\n• Once you Clock In you'll have a private message from the bot, Please check your messages.\n\n• Whenever taking breaks timer stops, once you are ready to work again you simply click **(Continue Working)**\n"
      );

    // Create the action row with the select menu
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("mainMsg_selectMenu")
        .setPlaceholder("⭐ › Select a option")
        .addOptions(
          // clockin
          new StringSelectMenuOptionBuilder()
            .setLabel("Clock in")
            .setEmoji("<:briefcase:1251845682768117861>")
            .setValue("clockin"),
          // register
          new StringSelectMenuOptionBuilder()
            .setLabel("Register")
            .setEmoji("<:form:1340541917712224306>")
            .setValue("register"),
          // request timeoff
          new StringSelectMenuOptionBuilder()
            .setLabel("Request time off")
            .setEmoji("<:calendarclock:1251845685133836319>")
            .setValue("timeoff"),
          //emergency leave
          new StringSelectMenuOptionBuilder()
            .setLabel("Emergency leave")
            .setEmoji("<:emergency:1251845682768117861>")
            .setValue("emergency"),
          // balance
          new StringSelectMenuOptionBuilder()
            .setLabel("Balance")
            .setEmoji("<:sackdollar:1251843223819780156>")
            .setValue("balance"),
          // contact hr for segritude and blank for other guilds
          ...(interaction.guild.id === guildId
            ? [
                new StringSelectMenuOptionBuilder()
                  .setLabel("Contact HR")
                  .setEmoji("<:humanresources:1300921297022357545>")
                  .setValue("contacthr"),
              ]
            : []),
          // report issue
          new StringSelectMenuOptionBuilder()
            .setLabel("Report issue")
            .setEmoji("<:warning:1254878169723568209>")
            .setValue("issue"),
          // send suggestion
          new StringSelectMenuOptionBuilder()
            .setLabel("Send suggestion")
            .setEmoji("<:suggestion:1340542046943051777>")
            .setValue("suggestion")
        )
    );

    await interaction.channel.send({
      embeds: [embedImage, embedDescription],
      components: [row],
    });

    return interaction.editReply({
      content: "✅ **Setup message has been sent!**",
      flags: MessageFlags.Ephemeral,
    });
  },
};
