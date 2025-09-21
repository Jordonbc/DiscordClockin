const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const TARGET_GUILD_ID = process.env.GUILD_ID;

function buildClockSelectOptions({ guildId }) {
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
    options.splice(
      5,
      0,
      new StringSelectMenuOptionBuilder()
        .setLabel("Contact HR")
        .setEmoji("<:humanresources:1300921297022357545>")
        .setValue("contacthr")
    );
  }

  return options;
}

function buildMainClockSelectRow({ guildId }) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("mainMsg_selectMenu")
    .setPlaceholder("⭐ › Select an option")
    .addOptions(buildClockSelectOptions({ guildId }));

  return new ActionRowBuilder().addComponents(selectMenu);
}

module.exports = {
  buildClockSelectOptions,
  buildMainClockSelectRow,
};
