const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
require("dotenv").config();

const guildId = process.env.GUILD_ID;
const issuesForumChannelId = process.env.ISSUES_FORUM_CHANNEL_ID;

// this modal handler is called when the user clicks on Send suggestion
module.exports = {
  id: "send_suggestion_modal",
  //permissions: [],
  run: async (client, interaction) => {
    const issue = interaction.fields.getTextInputValue("description");

    if (issue) {
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(`>>> *${issue}*`)
        .setFooter({
          text: interaction.user.id,
          iconURL: interaction.user.displayAvatarURL(),
        });

      const guild = await client.guilds.cache.get(guildId);
      const issuesForum = await guild.channels.cache.get(issuesForumChannelId);

      const solvedButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Added")
          .setStyle("Success")
          .setCustomId("added_suggestion_button"),
        new ButtonBuilder()
          .setLabel("Decline")
          .setStyle("Danger")
          .setCustomId("decline_suggestion_button")
      );

      issuesForum.threads.create({
        name: `${interaction.user.displayName}`,
        appliedTags: [
          issuesForum.availableTags.find((tag) => tag.name === "suggestion").id,
        ],
        message: { embeds: [embed], components: [solvedButton] },
      });

      interaction.reply({
        content:
          "☑️ I successfully sent your suggestion.\nYou'll receive a dm, if your suggestion will be added or declined.",
        embeds: [embed],
        ephemeral: true,
      });
    }
  },
};
