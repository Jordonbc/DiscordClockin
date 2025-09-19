const GuildWorkers = require("../models/worker.js");
const calculateBreakTime = require("../functions/break/calculateBreakTime.js");
const backendApi = require("../utils/backendApi.js");

async function handleWorkerEvents(event, userId, guildId, messageId = null) {
  const guildWorkers = await GuildWorkers.findOne({ guildId });

  if (!guildWorkers) {
    console.warn(
      `[handleWorkerEvents] Guild workers document not found for guild ${guildId}`
    );
    return;
  }

  const worker = guildWorkers.workers.find(
    (candidate) => candidate.userId === userId
  );

  if (!worker) {
    console.warn(
      `[handleWorkerEvents] Worker ${userId} not found for guild ${guildId}`
    );
    return;
  }

  if (event === "clockout") {
    await handleClockout(worker, guildWorkers, guildId, userId);
  }

  if (event === "clockin") {
    await handleClockin(worker, guildWorkers, messageId, guildId, userId);
  }

  if (event === "break") {
    await handleBreak(worker, guildWorkers, guildId, userId);
  }

  if (event === "back") {
    await handleBack(worker, guildWorkers, guildId, userId);
  }
}

const handleClockout = async (worker, guildWorkers, guildId, userId) => {
  worker.status = "Offline";
  worker.breaksCount = 0;
  worker.worked = 0;
  worker.breakTime = 0;
  worker.clockDates.clockOut.push(Date.now());
  worker.afkDates.afkOut = [];
  worker.afkDates.afkIn = [];
  await guildWorkers.save();
  await backendApi.endShift({ guildId, userId });
};

const handleClockin = async (
  worker,
  guildWorkers,
  messageId,
  guildId,
  userId
) => {
  worker.clockInMessage = messageId;
  worker.status = "Work";
  worker.clockDates.clockIn.push(Date.now());
  await guildWorkers.save();
  await backendApi.startShift({
    guildId,
    userId,
    clockInMessageId: messageId,
  });
};

const handleBreak = async (worker, guildWorkers, guildId, userId) => {
  worker.status = "Break";
  worker.breaksCount++;
  worker.afkDates.afkIn.push(Date.now());
  await guildWorkers.save();
  await backendApi.startBreak({ guildId, userId });
};

const handleBack = async (worker, guildWorkers, guildId, userId) => {
  worker.status = "Work";
  worker.afkDates.afkOut.push(Date.now());
  worker.breakTime += calculateBreakTime(worker);
  worker.afkDates.afkOut = [];
  worker.afkDates.afkIn = [];
  await guildWorkers.save();
  await backendApi.endBreak({ guildId, userId });
};

module.exports = handleWorkerEvents;
