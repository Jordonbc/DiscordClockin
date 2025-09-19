const { EmbedBuilder } = require("discord.js");
const cron = require("cron");
const Worker = require("../../models/worker.js");
const Role = require("../../models/roles.js");
const Guild = require("../../models/guildSettings.js");
const Holidays = require("../../models/holidaysTimers.js");

function getCurrentWeekDates() {
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  return `${formatDate(oneWeekAgo)} - ${formatDate(today)}`;
}

function getToPay(workers, roles) {
  try {
    let toPay = 0;
    for (const worker of workers) {
      const role = roles.find((role) => role.id === worker.roleId);
      if (role && role.hourlySalary) {
        const hourlyRate = role.hourlySalary.get(worker.experience);
        if (!isNaN(hourlyRate)) {
          toPay += worker.weeklyWorked * hourlyRate;
        }
      }
    }
    return Math.floor(toPay * 100) / 100;
  } catch (error) {
    console.error("Error calculating payment:", error);
    return 0;
  }
}

async function handleWorkerStatus(guildWorkers) {
  for (const worker of guildWorkers.workers) {
    if (worker.status === "Offline") continue;

    let timeWorked = 0;

    // Ensure worker.breakTime is a number
    worker.breakTime = isNaN(worker.breakTime) ? 0 : worker.breakTime;

    // Clock out workers still clocked in
    if (
      worker.clockDates.clockIn.length > worker.clockDates.clockOut.length &&
      worker.status === "Work"
    ) {
      worker.clockDates.clockOut.push(new Date());
      const lastClockIn =
        worker.clockDates.clockIn[worker.clockDates.clockIn.length - 1];
      const lastClockOut =
        worker.clockDates.clockOut[worker.clockDates.clockOut.length - 1];
      timeWorked =
        (lastClockOut - lastClockIn - worker.breakTime * 3600000) / 3600000;

      // Ensure valid number
      timeWorked = isNaN(timeWorked) ? 0 : timeWorked;

      // TODO: Notify worker & send Redis event
    }

    // Clockout the workers who are on break
    if (
      worker.afkDates.afkIn.length > worker.afkDates.afkOut.length &&
      worker.status === "Break"
    ) {
      worker.afkDates.afkOut.push(new Date());

      if (worker.clockDates.clockIn.length > worker.clockDates.clockOut.length)
        worker.clockDates.clockOut.push(new Date());

      const lastClockIn =
        worker.clockDates.clockIn[worker.clockDates.clockIn.length - 1];
      const lastClockOut =
        worker.clockDates.clockOut[worker.clockDates.clockOut.length - 1];

      const lastAfkIn = worker.afkDates.afkIn[worker.afkDates.afkIn.length - 1];
      const lastAfkOut =
        worker.afkDates.afkOut[worker.afkDates.afkOut.length - 1];

      // Calculate break time safely
      let breakTime = lastAfkOut && lastAfkIn ? lastAfkOut - lastAfkIn : 0;
      breakTime = isNaN(breakTime) ? 0 : breakTime;

      worker.breakTime += breakTime / 3600000;
      worker.breakCount += 1;
      timeWorked =
        (lastClockOut - lastClockIn - worker.breakTime * 3600000) / 3600000;
      timeWorked = isNaN(timeWorked) ? 0 : timeWorked;
    }

    if (timeWorked > 0) {
      worker.dailyWorked += timeWorked;
      worker.weeklyWorked += timeWorked;
      worker.totalWorked += timeWorked;
    }

    worker.status = "Offline";
  }
  await guildWorkers.save();
}

async function createEmbeds(guildDB, guildWorkers, roles, client) {
  try {
    const embeds = [];
    const guild = client.guilds.cache.get(guildDB.guildId);

    // Fetch the user object of the bot to get the banner URL
    const user = await client.users.fetch(client.user.id, { force: true });
    const bannerUrl =
      user.bannerURL({ format: "png", size: 1024 }) ||
      "https://i.imgur.com/abKnqEb.jpeg"; // Default banner URL

    // Create initial embed with banner
    const bannerEmbed = new EmbedBuilder()
      .setColor("#81e6ff")
      .setImage(bannerUrl);
    embeds.push(bannerEmbed);

    const targetHours = guildDB.targetHours || 5;
    const toPay = getToPay(guildWorkers.workers, roles.roles);

    // Create base embed
    const baseEmbed = new EmbedBuilder()
      .setColor("#81e6ff")
      .setDescription(
        `## Weekly notification\n> <:icon_clock:1337325886147526688> **Target hours value:** \`${targetHours} hours\`\n> <:icon_pound:1337326268139700247> **To pay:** \`£${toPay}p\``
      )
      .setFooter({ text: getCurrentWeekDates() });

    // Split workers based on target hours
    const workersReached = guildWorkers.workers.filter(
      (worker) => worker.weeklyWorked >= targetHours
    );
    const workersNotReached = guildWorkers.workers.filter(
      (worker) => worker.weeklyWorked < targetHours
    );

    let currentEmbed = baseEmbed;
    let reachedText = "";
    let notReachedText = "";

    // Process workers who reached target
    for (const worker of workersReached) {
      const workerInfo = await formatWorkerInfo(worker, roles, client, guildDB);
      if (workerInfo) {
        if ((reachedText + workerInfo).length > 1024) {
          // Add current fields and create new embed
          currentEmbed.addFields(
            {
              name: "Target value reached",
              value: reachedText || "\u200B",
              inline: true,
            },
            {
              name: "Target value not reached",
              value: notReachedText || "\u200B",
              inline: true,
            }
          );
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder()
            .setColor("#81e6ff")
            .setDescription(baseEmbed.data.description)
            .setFooter(baseEmbed.data.footer);
          reachedText = workerInfo;
          notReachedText = "";
        } else {
          reachedText += workerInfo;
        }
      }
    }

    // Process workers who didn't reach target
    for (const worker of workersNotReached) {
      const workerInfo = await formatWorkerInfo(
        worker,
        roles,
        client,
        guildDB,
        false
      );
      if (workerInfo) {
        if ((notReachedText + workerInfo).length > 1024) {
          // Add current fields and create new embed
          currentEmbed.addFields(
            {
              name: "Target value reached",
              value: reachedText || "\u200B",
              inline: true,
            },
            {
              name: "Target value not reached",
              value: notReachedText || "\u200B",
              inline: true,
            }
          );
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder()
            .setColor("#81e6ff")
            .setDescription(baseEmbed.data.description)
            .setFooter(baseEmbed.data.footer);
          reachedText = "";
          notReachedText = workerInfo;
        } else {
          notReachedText += workerInfo;
        }
      }
    }

    // Add remaining fields
    if (reachedText || notReachedText) {
      currentEmbed.addFields(
        {
          name: "Target value reached",
          value: reachedText || "\u200B",
          inline: true,
        },
        {
          name: "Target value not reached",
          value: notReachedText || "\u200B",
          inline: true,
        }
      );
      embeds.push(currentEmbed);
    }

    return embeds;
  } catch (error) {
    console.error("Error creating embeds:", error);
    // Return a basic error embed
    return [
      new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(
          "An error occurred while generating the weekly report."
        ),
    ];
  }
}

async function formatWorkerInfo(
  worker,
  roles,
  client,
  guildDB,
  reached = true
) {
  try {
    const role = roles.roles.find((r) => r.id === worker.roleId);
    if (!role) return null;

    const user = await client.users.fetch(worker.userId).catch(() => null);
    if (!user) return null;

    const hoursWorked = Math.floor(worker.weeklyWorked);
    const minutesWorked = Math.floor(
      (worker.weeklyWorked - hoursWorked) / 0.01666667
    );

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const userHolidays = await Holidays.findOne({
      userId: worker.userId,
      guildId: guildDB.guildId,
      endDate: { $gte: sevenDaysAgo, $lt: today },
      startDate: { $lte: today },
    });

    const statusIcon = userHolidays
      ? "<a:holiday:1340288540625342505>"
      : reached
      ? "<a:online:1340287493701894216>"
      : "<:icon_dnd:1337376989417439234>";

    return `${statusIcon} **${user.tag}** [${hoursWorked}h ${minutesWorked}m]\n`;
  } catch (error) {
    console.error("Error formatting worker info:", error);
    return null;
  }
}

async function resetWorkerStats(guildWorkers) {
  try {
    console.log("Resetting worker stats for guild", guildWorkers.guildId);

    for (const worker of guildWorkers.workers) {
      worker.weeklyWorked = 0;
      worker.clockDates.clockIn = [];
      worker.clockDates.clockOut = [];
      worker.breakCount = 0;
      worker.breakTime = 0;
      worker.afkDates.afkIn = [];
      worker.afkDates.afkOut = [];
    }
    await guildWorkers.save();
  } catch (error) {
    console.error("Error resetting worker stats:", error);
  }
}

async function saveWorkSessions(guildWorkers, roles) {
  try {
    const WorkSession = require("../../models/workSession.js");

    for (const worker of guildWorkers.workers) {
      // Only create sessions for workers who actually worked
      if (worker.weeklyWorked > 0) {
        // Find the earliest clock in and latest clock out
        const clockInTime = new Date(
          Math.min(...worker.clockDates.clockIn.map((date) => new Date(date)))
        );
        const clockOutTime = new Date(
          Math.max(...worker.clockDates.clockOut.map((date) => new Date(date)))
        );

        // Format breaks array
        const breaks = [];
        for (let i = 0; i < worker.afkDates.afkIn.length; i++) {
          if (worker.afkDates.afkOut[i]) {
            breaks.push({
              breakStart: new Date(worker.afkDates.afkIn[i]),
              breakEnd: new Date(worker.afkDates.afkOut[i]),
            });
          }
        }

        // Calculate total earnings
        const role = roles.roles.find((r) => r.id === worker.roleId);
        const hourlyRate = role?.hourlySalary?.get(worker.experience) || 0;
        const totalEarnings = worker.weeklyWorked * hourlyRate;

        // Format times as strings (hours and minutes)
        const formatTime = (hours) => {
          const wholeHours = Math.floor(hours);
          const minutes = Math.round((hours - wholeHours) * 60);
          return `${wholeHours}h ${minutes}m`;
        };

        const workSession = new WorkSession({
          guildId: guildWorkers.guildId,
          userId: worker.userId,
          clockInTime: clockInTime,
          clockOutTime: clockOutTime,
          clockDates: {
            breaks: breaks,
          },
          totalWorkedTime: formatTime(worker.weeklyWorked),
          totalBreakTime: formatTime(worker.breakTime),
          totalEarnings: Math.round(totalEarnings * 100) / 100,
          workDescription: "Weekly work session",
          taskHeading: "Weekly Summary",
          status: "Completed",
        });

        await workSession.save();
      }
    }
  } catch (error) {
    console.error("Error saving work sessions:", error);
  }
}

module.exports = async (client) => {
  const weeklyEvent = new cron.CronJob("00 00 00 * * 1", async () => {
    // const weeklyEvent = new cron.CronJob("* * * * *", async () => {
    try {
      // Get all guilds with weekly report channel
      const allGuilds = await Guild.find({
        weeklyReportChannelId: { $exists: true },
      });

      for (const guildDB of allGuilds) {
        try {
          // Get workers and roles for the guild
          const guildWorkers = await Worker.findOne({
            guildId: guildDB.guildId,
          });
          if (!guildWorkers?.workers) continue;

          const roles = await Role.findOne({ guildId: guildDB.guildId });
          if (!roles?.roles) continue;

          // Handle worker status
          await handleWorkerStatus(guildWorkers);

          // Create and send embeds
          const embeds = await createEmbeds(
            guildDB,
            guildWorkers,
            roles,
            client
          );

          const server = client.guilds.cache.get(guildDB.guildId);
          if (!server) continue;

          const channel = server.channels.cache.get(
            guildDB.weeklyReportChannelId
          );
          if (!channel) continue;

          await channel.send({ embeds });

          // Try to save work sessions but continue even if it fails
          try {
            await saveWorkSessions(guildWorkers, roles);
          } catch (error) {
            console.error(
              `Failed to save work sessions for guild ${guildDB.guildId}:`,
              error
            );
            // Optional: Send notification to an admin channel or log to a monitoring service
          }

          // Reset worker stats after successful send
          await resetWorkerStats(guildWorkers);
        } catch (error) {
          console.error(`Error processing guild ${guildDB.guildId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in weekly notification job:", error);
    }
  });

  weeklyEvent.start();
};
