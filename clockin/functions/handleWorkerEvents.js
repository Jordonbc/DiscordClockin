const GuildWorkers = require("../models/worker.js");
const calculateBreakTime = require("../functions/break/calculateBreakTime.js");

async function handleWorkerEvents(event, userId, guildId, messageId = null) {
  const guildWorkers = await GuildWorkers.findOne({ guildId });
  const worker = guildWorkers.workers.find(
    (worker) => worker.userId === userId
  );

  if (event === "clockout") handleClockout(worker, guildWorkers);

  if (event === "clockin") handleClockin(worker, guildWorkers, messageId);

  if (event === "break") handleBreak(worker, guildWorkers);

  if (event === "back") handleBack(worker, guildWorkers);
}

const handleClockout = async (worker, guildWorkers) => {
  worker.status = "Offline";
  worker.breaksCount = 0;
  worker.worked = 0;
  worker.breakTime = 0;
  worker.clockDates.clockOut.push(Date.now());
  worker.afkDates.afkOut = [];
  worker.afkDates.afkIn = [];
  await guildWorkers.save();
};

const handleClockin = async (worker, guildWorkers, messageId) => {
  worker.clockInMessage = messageId;
  worker.status = "Work";
  worker.clockDates.clockIn.push(Date.now());
  await guildWorkers.save();
};

const handleBreak = async (worker, guildWorkers) => {
  worker.status = "Break";
  worker.breaksCount++;
  worker.afkDates.afkIn.push(Date.now());
  await guildWorkers.save();
};

const handleBack = async (worker, guildWorkers) => {
  worker.status = "Work";
  worker.afkDates.afkOut.push(Date.now());
  worker.breakTime += calculateBreakTime(worker);
  worker.afkDates.afkOut = [];
  worker.afkDates.afkIn = [];
  await guildWorkers.save();
};

module.exports = handleWorkerEvents;
