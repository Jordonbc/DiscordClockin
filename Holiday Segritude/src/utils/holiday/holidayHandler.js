const { EmbedBuilder } = require("discord.js");
const GuildSettings = require("../../models/guildSettings");
const GuildWorkers = require("../../models/guildWorkers");
const HolidayTimers = require("../../models/holidayTimers");
const connectToDatabase = require("../../utils/database/db");
const { getEligibleAdmins } = require("../../utils/holiday/getEligibleAdmins");
const { sendDMsToAdmins } = require("../../utils/holiday/sendDmToAdmin");
const {
  createHolidayAttachment,
} = require("../../utils/holiday/createHolidayAttachment");

// 📌 Handles the "holidayStart" job
async function handleHolidayStart(job, client) {
  const { userId, guildId, fileContent, startDate, endDate } = job.data;
  console.log(
    `Processing holiday start for User: ${userId}, Guild: ${guildId}`
  );

  const guildSettings = await GuildSettings.findOne({ guildId }).lean();
  if (!guildSettings?.botAdminRole?.length) {
    console.log(`⚠️ No bot admin roles found for Guild: ${guildId}`);
    return;
  }

  const attachment = await createHolidayAttachment(fileContent, userId);
  const admins = await getEligibleAdmins(
    client,
    guildId,
    guildSettings.botAdminRole
  );
  if (!admins.length) return;

  const embed = new EmbedBuilder()
    .setTitle("🏖️ Holiday Started")
    .setColor("#4CAF50")
    .setDescription(`A user has started their holiday.`)
    .addFields(
      { name: "👤 User", value: `<@${userId}>`, inline: true },
      {
        name: "📅 Start Date",
        value: `<t:${Math.floor(new Date(startDate).getTime() / 1000)}:F>`,
        inline: true,
      },
      {
        name: "📅 End Date",
        value: `<t:${Math.floor(new Date(endDate).getTime() / 1000)}:F>`,
        inline: true,
      }
    )
    .setTimestamp();

  if (attachment) {
    embed.addFields({
      name: "📝 Note",
      value: "Holiday details are attached to this message",
      inline: false,
    });
  }

  await sendDMsToAdmins(admins, embed, attachment, userId);
}

// 📌 Handles the "holidayEnd" job
async function handleHolidayEnd(job, client) {
  try {
    const { userId, guildId, startDate, endDate } = job.data;
    console.log(
      `[handleHolidayEnd] Start: userId=${userId}, guildId=${guildId}, jobId=${job.id}, startDate=${startDate}, endDate=${endDate}`
    );

    const guildSettings = await GuildSettings.findOne({ guildId }).lean();
    console.log(`[handleHolidayEnd] Loaded guildSettings:`, guildSettings);

    if (!guildSettings?.botAdminRole?.length) {
      console.log(
        `[handleHolidayEnd] ⚠️ No bot admin roles found for Guild: ${guildId}`
      );
      return;
    }

    const admins = await getEligibleAdmins(
      client,
      guildId,
      guildSettings.botAdminRole
    );
    console.log(
      `[handleHolidayEnd] Eligible admins:`,
      admins.map((a) => a.id)
    );

    if (!admins.length) {
      console.log(`[handleHolidayEnd] No eligible admins found, aborting.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📢 Holiday Ended")
      .setColor("#F44336")
      .setDescription(`A user's holiday has ended.`)
      .addFields(
        { name: "👤 User", value: `<@${userId}>`, inline: true },
        {
          name: "📅 Start Date",
          value: `<t:${Math.floor(new Date(startDate).getTime() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "📅 End Date",
          value: `<t:${Math.floor(new Date(endDate).getTime() / 1000)}:F>`,
          inline: true,
        }
      )
      .setTimestamp();

    // Delete the database holiday entry for the worker
    console.log(`[handleHolidayEnd] Connecting to database...`);
    await connectToDatabase();
    console.log(`[handleHolidayEnd] Connected to database.`);

    // Use Mongoose document, not lean object
    const guildWorkers = await GuildWorkers.findOne({ guildId });
    console.log(`[handleHolidayEnd] Loaded guildWorkers:`, !!guildWorkers);

    if (!guildWorkers) {
      console.log(
        `[handleHolidayEnd] ⚠️ No guild workers found for Guild: ${guildId}`
      );
      return;
    }

    const worker = guildWorkers.workers.find(
      (worker) => worker.userId === userId
    );
    console.log(`[handleHolidayEnd] Found worker:`, !!worker);

    if (!worker) {
      console.log(
        `[handleHolidayEnd] ⚠️ No worker found for User: ${userId} in Guild: ${guildId}`
      );
      return;
    }

    // Ensure pastHolidays is initialized
    if (!Array.isArray(worker.pastHolidays)) {
      console.log(
        `[handleHolidayEnd] Initializing worker.pastHolidays as empty array.`
      );
      worker.pastHolidays = [];
    } else {
      console.log(
        `[handleHolidayEnd] worker.pastHolidays exists with length:`,
        worker.pastHolidays.length
      );
    }

    // Update the worker's onLeave start and end dates
    console.log(
      `[handleHolidayEnd] Setting worker.onLeave.start and .end to null.`
    );
    worker.onLeave.start = null;
    worker.onLeave.end = null;

    console.log(`[handleHolidayEnd] Pushing new holiday to pastHolidays:`, {
      start: startDate,
      end: endDate,
      startEpoch: new Date(startDate).getTime(),
      endEpoch: new Date(endDate).getTime(),
    });
    worker.pastHolidays.push({
      start: startDate,
      end: endDate,
      startEpoch: new Date(startDate).getTime(),
      endEpoch: new Date(endDate).getTime(),
    });

    console.log(`[handleHolidayEnd] Saving guildWorkers...`);
    await guildWorkers.save();
    console.log(`[handleHolidayEnd] guildWorkers saved.`);

    // delete holiday timer using redis job id and userId
    console.log(
      `[handleHolidayEnd] Deleting HolidayTimers with redisJobId=${String(
        job.id
      )} and userId=${userId}`
    );
    const deleteResult = await HolidayTimers.deleteOne({
      redisJobId: String(job.id),
      userId,
      guildId,
    });
    console.log(
      `[handleHolidayEnd] HolidayTimers delete result:`,
      deleteResult
    );

    console.log(`[handleHolidayEnd] Sending DMs to admins...`);
    await sendDMsToAdmins(admins, embed, null, userId);
    console.log(`[handleHolidayEnd] DMs sent to admins.`);
  } catch (error) {
    console.error(`[handleHolidayEnd] Error:`, error);
  }
}

module.exports = { handleHolidayStart, handleHolidayEnd };
