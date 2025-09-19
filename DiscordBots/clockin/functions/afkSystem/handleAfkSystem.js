const afkQueue = require("../../queues/afkQueue");
const afkTimers = require("../../models/afkReminders");

/**
 * Handles the AFK system by scheduling jobs to notify admins and end the AFK period.
 *
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @param {string} messageId - The ID of the message.
 * @param {number} afkReminderTime - The time for the AFK reminder.
 * @returns {Promise<void>} - A promise that resolves when the AFK system is handled.
 */
const handleAfkSystem = async (guildId, userId, messageId, afkReminderTime) => {
  try {
    // ✅ Override dates for testing (2 minute from now and 30 seconds from now)
    let startDate = new Date();
    let endDate = new Date(Date.now() + afkReminderTime * 60 * 60 * 1000); // 6 hours later
    // const endDate = new Date(Date.now() + 1 * 60 * 1000); // 2 minutes later

    const delay = new Date(endDate).getTime() - Date.now();
    if (delay <= 0) {
      console.error("End date is in the past. Skipping queue.");
      return;
    }

    // ✅ Immediate job to notify admins now
    await afkQueue.add(
      "afkStart",
      { guildId, userId, messageId, afkReminderTime },
      { delay: 10_000 }
    );

    // ✅ Delayed job to notify when the afk timer ends
    const endJob = await afkQueue.add(
      "afkEnd",
      { guildId, userId, messageId, startDate, endDate },
      { delay }
    );

    //TODO: Add the user id to the afkTimers collection
    await afkTimers.findOneAndUpdate(
      { messageId }, // Filter: Find the document with the same messageId
      {
        $set: {
          endTime: endDate,
          redisJobId: endJob.id,
          status: "scheduled",
        },
      },
      { upsert: true, new: true } // Create if not exists, return updated document
    );

    console.log(
      `Afk timer jobs scheduled: First job at ${new Date(
        Date.now() + 30 * 1000
      )} & 2nd (at ${endDate}) for user ${userId} in guild ${guildId} with endJobId: ${
        endJob.id
      }`
    );
  } catch (error) {
    console.error("Error scheduling afk timers:", error);
  }
};

module.exports = { handleAfkSystem };
