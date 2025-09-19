const updateClockinMessage = require("../../utils/updateClockinMessage");
const handleSession = require("./handleSession");

/**
 * Handles the timeout scenario if the user doesn't respond within 15 minutes.
 * @param {Object} client - The Discord client instance.
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @param {string} messageId - The ID of the message.
 * @returns {Promise<void>}
 */
module.exports = async function handleAfkTimeout(
  client,
  guildId,
  userId,
  messageId
) {
  try {
    console.log(`User ${userId} did not respond in time. Marking as Offline.`);

    // Notify the user about being clocked out
    const user = await client.users.fetch(userId);
    if (user) {
      await user.send(
        "⏳ You did not respond in time. You have been marked as **Offline**."
      );
    }

    await handleSession(client, guildId, userId, messageId);

    await updateClockinMessage(client, guildId);
  } catch (error) {
    console.error(`Failed to handle AFK timeout for ${userId}:`, error);
  }
};
