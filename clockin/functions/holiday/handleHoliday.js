const holidayQueue = require("../../queues/holidayQueue");
const holidayTimers = require("../../models/holidaysTimers");

/**
 * Handles the scheduling of holiday notifications.
 *
 * @param {Date} startDate - The start date of the holiday.
 * @param {Date} endDate - The end date of the holiday.
 * @param {string} userId - The ID of the user.
 * @param {string} guildId - The ID of the guild.
 * @param {string} fileContent - The content of the file to be processed.
 * @returns {Promise<void>}
 */

const handleHoliday = async (
  startDate,
  endDate,
  userId,
  guildId,
  fileContent
) => {
  try {
    // Split the date and rearrange it to yyyy-mm-dd (ISO format)
    const [startDay, startMonth, startYear] = startDate.split("/");
    const [endDay, endMonth, endYear] = endDate.split("/");
    const formattedStartDate = `${startYear}-${startMonth}-${startDay}`;
    const formattedEndDate = `${endYear}-${endMonth}-${endDay}`;

    const parsedDate = {};
    parsedDate.startDate = new Date(formattedStartDate);
    parsedDate.endDate = new Date(formattedEndDate);

    const delay = new Date(parsedDate.endDate).getTime() - Date.now();
    if (delay <= 0) {
      console.error("End date is in the past. Skipping queue.");
      return;
    }

    // ✅ Immediate job to notify admins now
    await holidayQueue.add(
      "holidayStart",
      {
        userId,
        guildId,
        fileContent,
        startDate: parsedDate.startDate,
        endDate: parsedDate.endDate,
      },
      { delay: 10_000 }
    );

    // ✅ Delayed job to notify when the holiday ends
    const endJob = await holidayQueue.add(
      "holidayEnd",
      {
        userId,
        guildId,
        startDate: parsedDate.startDate,
        endDate: parsedDate.endDate,
      },
      { delay }
    );

    // Add the scheduled job ids to the database
    await holidayTimers.create({
      userId,
      guildId,
      startDate: parsedDate.startDate,
      endDate: parsedDate.endDate,
      redisJobId: endJob.id,
      status: "scheduled",
    });

    console.log(
      `Holiday jobs scheduled: First job at ${parsedDate.startDate} & 2nd (at ${parsedDate.endDate}) for user ${userId} in guild ${guildId}`
    );
  } catch (error) {
    console.error("Error scheduling holiday:", error);
  }
};

module.exports = { handleHoliday };
