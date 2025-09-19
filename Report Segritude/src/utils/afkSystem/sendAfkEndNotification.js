const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const GuildSettings = require("../../models/guildSettings");
const { getEligibleAdmins } = require("../../utils/holiday/getEligibleAdmins");
const { sendDMsToAdmins } = require("../../utils/holiday/sendDmToAdmin");
const handleAfkTimeout = require("./handleAfkTimeout");

/**
 * Sends a DM notification to the user when their AFK period is ending and starts a collector.
 * @param {Object} client - The Discord client instance.
 * @param {string} userId - The ID of the user.
 * @param {string} startDate - The start date of the holiday.
 * @param {string} endDate - The end date of the holiday.
 * @param {string} guildId - The guild ID for status updates.
 * @param {string} messageId - The message ID for tracking.
 * @returns {string} The message ID for tracking.
 */
module.exports = async function sendAfkEndNotification(
  client,
  userId,
  startDate,
  endDate,
  guildId,
  messageId
) {
  try {
    const user = await client.users.fetch(userId);
    if (!user) return console.error(`User ${userId} not found.`);

    const embed = new EmbedBuilder()
      .setTitle("📢 AFK Timeout Check - Are You There?")
      .setColor("#F44336")
      .setDescription(
        `This is an automated AFK check to ensure you're still working.`
      )
      .addFields(
        {
          name: "📅 Start Time",
          value: `<t:${Math.floor(new Date(startDate).getTime() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "📅 End Time",
          value: `<t:${Math.floor(new Date(endDate).getTime() / 1000)}:F>`,
          inline: true,
        }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`afk_confirm_${userId}`)
        .setLabel("I'm Here!")
        .setStyle(ButtonStyle.Success)
    );

    const message = await user.send({ embeds: [embed], components: [row] });

    // Create a collector that waits for user interaction for 15 minutes
    const collector = message.createMessageComponentCollector({
      filter: (interaction) => interaction.customId === `afk_confirm_${userId}`,
      time: 15 * 60 * 1000, // 15 minutes
    });

    // 📌 Event: "collect" when the user responds
    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== userId) return;

      await interaction.reply({
        content: "✅ Great! You're still here. Keep up the good work!",
        ephemeral: true,
      });
      collector.stop("user_confirmed");

      await message.delete();
    });

    // 📌 Event: "end" when the collector times out
    collector.on("end", async (collected, reason) => {
      if (reason === "user_confirmed") return; // User responded, do nothing

      // Notify the admins about system breach
      console.log(`User ${userId} did not respond, setting status to Offline.`);
      await handleAfkTimeout(client, guildId, userId, messageId);

      const guildSettings = await GuildSettings.findOne({ guildId }).lean();
      if (!guildSettings?.botAdminRole?.length) {
        console.log(`⚠️ No bot admin roles found for Guild: ${guildId}`);
        return;
      }

      const admins = await getEligibleAdmins(
        client,
        guildId,
        guildSettings.botAdminRole
      );
      if (!admins.length) return;

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Breaching the system")
        .setColor("#4CAF50")
        .setDescription(`A user has gone AFK while being clocked in.`)
        .addFields({ name: "👤 User", value: `<@${userId}>`, inline: true })
        .setTimestamp();

      await sendDMsToAdmins(admins, embed, null, userId);
      await message.delete();
    });

    // return message.id; // Return message ID for tracking
  } catch (error) {
    console.error(`Failed to send AFK end message to ${userId}:`, error);
  }
};
