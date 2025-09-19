const {
  EmbedBuilder,
  ApplicationCommandType,
  version,
  time,
} = require("discord.js");
const botJSON = require("../../package.json");
const Workers = require("../../models/worker.js");
const config = require("../../config.json");

async function getUsersCount() {
  const workerGuilds = await Workers.find();
  let count = 0;
  for (guild of workerGuilds) {
    count += guild.workers.length;
  }
  return count;
}

module.exports = {
  name: "bot-info",
  description: "» Shows you all infos about the bot",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  options: [],
  category: "Information",
  run: async (client, interaction) => {
    try {
      // Defer the reply immediately to prevent timeout
      await interaction.deferReply();

      // Fetching the guilds count of the bot
      const guilds = client.guilds.cache.size;

      const {
        discordInviteBaseUrl,
        discordInvitePermissions,
        discordInviteScopes,
        discordSupportServerUrl,
      } = config;
      const clientId = process.env.CLIENT_ID;

      if (
        !discordInviteBaseUrl ||
        !discordInvitePermissions ||
        !discordInviteScopes ||
        !discordSupportServerUrl ||
        !clientId
      ) {
        throw new Error("Missing Discord configuration values for bot-info command");
      }

      // Fetch the invite URL of the bot
      const inviteUrl = `${discordInviteBaseUrl}?client_id=${clientId}&permissions=${discordInvitePermissions}&scope=${discordInviteScopes}`;

      // Get verified workers count
      const usersCount = await getUsersCount();

      // Create the bot info embed
      const embed = new EmbedBuilder()
        .setTitle("🤖 » **__BOT INFO__**")
        .setColor("#81e6ff")
        .setDescription("Here you find all information about the bot.")
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          {
            name: "Bot version",
            value: "🤖 `" + botJSON.version + "`",
            inline: true,
          },
          {
            name: "Discord.js version",
            value: "🧑🏻‍💻 `" + version + "`",
            inline: true,
          },
          {
            name: "Uptime",
            value:
              "⏱️ " +
              time(Math.floor((Date.now() - client.uptime) / 1000), "R"),
            inline: true,
          },
          {
            name: "Servers",
            value: "🔢 `" + guilds + "`",
            inline: true,
          },
          {
            name: "Verified workers",
            value: "☑️ `" + usersCount + "`",
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: true },
          {
            name: "Invite Link:",
            value: `📌 [Click here](${inviteUrl})`,
            inline: true,
          },
          {
            name: "Support server",
            value: `📌 [Click here](${discordSupportServerUrl})`,
            inline: true,
          }
        )
        .setFooter({
          text: "Created by @black_wither; Managed by @martialassault",
        });

      // Create an array to hold our embeds
      const embeds = [embed];

      // Fetch the user object of the bot to get the banner URL
      try {
        const user = await client.users.fetch(client.user.id, { force: true });
        const bannerURL = user.bannerURL({ format: "png", size: 1024 });

        // Only add the banner embed if the banner URL exists
        if (bannerURL) {
          const bannerEmbed = new EmbedBuilder()
            .setColor("#81e6ff")
            .setDescription("Bot Banner")
            .setImage(bannerURL);

          // Add the banner embed at the beginning of the array
          embeds.unshift(bannerEmbed);
        }
      } catch (error) {
        console.error("Error fetching banner:", error);
        // If there's an error fetching the banner, we'll just proceed with the info embed
      }

      // Edit the deferred reply with the embeds
      await interaction.editReply({ embeds: embeds });
    } catch (error) {
      console.error("Error in bot-info command:", error);

      // Try to edit the reply if it was deferred
      try {
        await interaction.editReply({
          content:
            "Sorry, there was an error displaying bot information. Please try again later.",
        });
      } catch (editError) {
        console.error("Error editing reply:", editError);

        // If editing fails, try a followUp as last resort
        try {
          await interaction.followUp({
            content:
              "Sorry, there was an error displaying bot information. Please try again later.",
            ephemeral: true,
          });
        } catch (followUpError) {
          console.error("Error sending followUp:", followUpError);
        }
      }
    }
  },
};
