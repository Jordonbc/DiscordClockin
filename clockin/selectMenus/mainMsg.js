const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const clockIn = require("../functions/clockin.js");
const register = require("../functions/register.js");
const emergency = require("../functions/emergency.js");
const { requestTimeOff } = require("../functions/requestTimeOff.js");
const { showBalance } = require("../functions/showBalance.js");
require("dotenv").config();

const primaryGuildId = process.env.GUILD_ID;

// This is the handler for the clockin embed select menu
module.exports = {
  id: "mainMsg_selectMenu",
  run: async (client, interaction) => {
    const resetMenu = async () => {
      try {
        const row = buildMainSelectMenu(interaction.guild?.id);
        await interaction.message.edit({ components: [row] });
      } catch (resetError) {
        console.error("Failed to reset main select menu:", resetError);
      }
    };

    try {
      const selected = interaction.values[0];

      if (selected === "clockin") {
        await clockIn(interaction);
      } else if (selected === "register") {
        await register(interaction);
      } else if (selected === "timeoff") {
        await requestTimeOff(interaction);
      } else if (selected === "emergency") {
        await emergency(interaction);
      } else if (selected === "balance") {
        await showBalance(interaction);
      } else if (selected === "contacthr") {
        const modal = new ModalBuilder()
          .setCustomId("contact_hr_modal")
          .setTitle("👥 | Contact HR")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("description")
                .setLabel("What is your concern?")
                .setMinLength(10)
                .setMaxLength(2000)
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph)
            )
          );

        await interaction.showModal(modal);
      } else if (selected === "issue") {
        const modal = new ModalBuilder()
          .setCustomId("report_issue_modal")
          .setTitle("⚠ | Report issue");

        const workInput = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Please describe the issue")
          .setMinLength(100)
          .setMaxLength(4000)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder().addComponents(workInput);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      } else if (selected === "suggestion") {
        const modal = new ModalBuilder()
          .setCustomId("send_suggestion_modal")
          .setTitle("💡 | Send suggestion")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("description")
                .setLabel("Please describe your suggestion")
                .setMinLength(30)
                .setMaxLength(4000)
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph)
            )
          );

        await interaction.showModal(modal);
      }
    } catch (error) {
      console.error("Error handling main select menu interaction:", error);
    } finally {
      await resetMenu();
    }
  },
};

function buildMainSelectMenu(guildId) {
  const select = new StringSelectMenuBuilder()
    .setCustomId("mainMsg_selectMenu")
    .setPlaceholder("⭐ › Select a option")
    .addOptions(
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
      ...(guildId && primaryGuildId && guildId === primaryGuildId
        ? [
            new StringSelectMenuOptionBuilder()
              .setLabel("Contact HR")
              .setEmoji("<:humanresources:1300921297022357545>")
              .setValue("contacthr"),
          ]
        : []),
      new StringSelectMenuOptionBuilder()
        .setLabel("Report issue")
        .setEmoji("<:warning:1254878169723568209>")
        .setValue("issue"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Send suggestion")
        .setEmoji("<:suggestion:1340542046943051777>")
        .setValue("suggestion")
    );

  return new ActionRowBuilder().addComponents(select);
}
