const GuildWorkers = require("../../models/guildWorkers");
const Roles = require("../../models/roles");
const ClockIns = require("../../models/clockins");
const Afkreminders = require("../../models/afkreminders");
const { EmbedBuilder } = require("discord.js");
const guildDB = require("../../models/guildSettings");

module.exports = async (client, guildId, userId, messageId) => {
  try {
    const guildWorkers = await GuildWorkers.findOne({ guildId });
    if (!guildWorkers) throw new Error("Guild's Workers not found");

    const worker = guildWorkers.workers.find((w) => w.userId === userId);
    if (!worker) throw new Error("Worker not found");

    const roles = await Roles.findOne({ guildId });
    if (!roles) throw new Error("Roles not found");

    const workerRole = roles.roles.find((role) => role.id === worker.roleId);
    if (!workerRole) throw new Error("Worker Role not found");

    // In case of a redis error, first check if the clockin length is greater than the clockout length
    if (
      worker.clockDates.clockIn.length <= worker.clockDates.clockOut.length ||
      !worker.clockDates.clockIn
    )
      return;

    // Handle Break Time Calculation
    if (worker.status === "Break") calculateBreakTime(worker);

    // Calculate Worked Hours
    worker.worked = calculateWorkedTime(worker);
    worker.weeklyWorked += worker.worked;
    worker.dailyWorked += worker.worked;
    worker.totalWorked += worker.worked;

    // Salary Calculation
    const hourlyRate = workerRole.hourlySalary.get(worker.experience) || 0;
    const salary = round(worker.worked * hourlyRate, 2);

    // Prepare Embed Messages
    const clockOutEmbed = createClockOutEmbed(worker, salary);
    const logEmbed = createLogEmbed(worker, salary);

    // Update worker status
    resetWorker(worker);
    await guildWorkers.save();

    // Fetch user and send DM
    const user = await client.users.fetch(worker.userId);
    const dmChannel = await user.createDM();
    await dmChannel.send({ embeds: [clockOutEmbed] });

    // Send log to channel
    const guildSettings = await guildDB.findOne({ guildId });
    if (guildSettings?.logChannelId) {
      const logChannel = client.guilds.cache
        .get(guildSettings.guildId)
        ?.channels.cache.get(guildSettings.logChannelId);
      if (logChannel)
        logChannel.send({ content: `<@${worker.userId}>`, embeds: [logEmbed] });
    }
  } catch (error) {
    console.error("Failed to handle the session", error);
  } finally {
    // Cleanup: Remove AFK Reminder & Clockin Record
    await Afkreminders.deleteOne({ messageId });
    await ClockIns.deleteOne({ userId });
  }
};

// ---------- HELPER FUNCTIONS ----------

// Calculates break time if the user was on break
function calculateBreakTime(worker) {
  const now = Date.now();
  worker.afkDates.afkOut.push(now);
  worker.breakTime +=
    (now - worker.afkDates.afkIn[worker.afkDates.afkOut.length - 1]) /
    (1000 * 60 * 60);
}

// Calculates total worked hours excluding break time
function calculateWorkedTime(worker) {
  const clockInTime = worker.clockDates?.clockIn?.slice(-1)[0] || 0;
  return (Date.now() - clockInTime) / (1000 * 60 * 60) - worker.breakTime;
}

// Formats time into hours & minutes
function formatTime(hours) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - wholeHours) * 60);
  return `${wholeHours} hours ${minutes} minutes`;
}

// Rounds numbers to 2 decimal places
function round(num, decimals) {
  return Math.round(num * 10 ** decimals) / 10 ** decimals;
}

// Creates embed for clock-out notification
function createClockOutEmbed(worker, salary) {
  return new EmbedBuilder()
    .setTitle("You have clocked out!")
    .addFields(
      { name: "Worked Time", value: formatTime(worker.worked), inline: true },
      { name: "Break Time", value: formatTime(worker.breakTime), inline: true },
      {
        name: "Breaks Count",
        value: worker.breaksCount.toString(),
        inline: true,
      },
      {
        name: "Total Hours (This Week)",
        value: formatTime(worker.weeklyWorked),
        inline: true,
      },
      { name: "Revenue", value: `£${salary}`, inline: true },
      {
        name: "Reason",
        value: "Worker was clocked out due to inactivity",
        inline: false,
      }
    )
    .setColor("Green");
}

// Creates log embed for logging channel
function createLogEmbed(worker, salary) {
  return new EmbedBuilder()
    .setDescription(`\`\`\`${worker.userId}\`\`\``)
    .addFields(
      { name: "Session Revenue", value: `£${salary}`, inline: false },
      { name: "Worked Time", value: formatTime(worker.worked), inline: true },
      { name: "Break Time", value: formatTime(worker.breakTime), inline: true },
      {
        name: "Breaks Count",
        value: worker.breaksCount.toString(),
        inline: true,
      },
      {
        name: "Total Hours (This Week)",
        value: formatTime(worker.weeklyWorked),
        inline: true,
      },
      {
        name: "Reason",
        value: "Worker was clocked out due to inactivity",
        inline: false,
      }
    )
    .setColor("Green")
    .setTimestamp();
}

// Resets worker status after clock-out
function resetWorker(worker) {
  worker.status = "Offline";
  worker.breaksCount = 0;
  worker.worked = 0;
  worker.breakTime = 0;
  worker.clockDates.clockOut.push(Date.now());
}
