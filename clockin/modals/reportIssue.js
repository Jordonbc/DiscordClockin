const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
require("dotenv").config();

const guildId = process.env.GUILD_ID;
const issuesForumChannelId = process.env.ISSUES_FORUM_CHANNEL_ID;

// this modal handler is called when the user clicks
module.exports = {
  id: "report_issue_modal",
  //permissions: [],
  run: async (client, interaction) => {
    // get the issue description from the modal
    const issue = interaction.fields.getTextInputValue("description");

    // if the issue is not empty
    if (issue) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(`>>> *${issue}*`)
        .setFooter({
          text: interaction.user.id,
          iconURL: interaction.user.displayAvatarURL(),
        });

      // get the guild and the issues forum channel
      const guild = await client.guilds.cache.get(guildId);
      const issuesForum = await guild.channels.cache.get(issuesForumChannelId);

      const solvedButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Fixed")
          .setStyle("Success")
          .setCustomId("fixed_issue_button")
      );

      // create a new thread in the issues forum
      issuesForum.threads.create({
        name: `${interaction.user.displayName}`,
        appliedTags: [issuesForum.availableTags[0].id],
        message: { embeds: [embed], components: [solvedButton] },
      });

      // send a reply to the user
      interaction.reply({
        content:
          "☑️ I successfully sent your report.\nAs soon as the issue has been resolved, you will receive a notification",
        embeds: [embed],
        ephemeral: true,
      });
    }
  },
};
