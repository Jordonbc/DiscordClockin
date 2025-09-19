const cron = require("node-cron");
const { exec } = require("child_process");
const holidayQueue = require("../queues/holidayQueue");
const holidayTimers = require("../models/holidaysTimers");
const redisClient = require("../utils/redisClient");

const REDIS_CONTAINER_NAME = "redis_container"; // Replace with your Redis container name

async function restoreHolidayTimers() {
  // 🔄 Run every 15 minutes to check Redis health
  cron.schedule("*/15 * * * *", async () => {
    try {
      await redisClient.ping();
      console.log("✅ Redis is healthy.");
    } catch (error) {
      console.error("❌ Redis connection lost. Checking container status...");
      restartRedisContainer();
    }
  });
}

// 🔄 Function to restart Redis if it's down
function restartRedisContainer() {
  exec(`docker ps -q -f name=${REDIS_CONTAINER_NAME}`, (err, stdout) => {
    if (err) {
      console.error("❌ Error checking Redis container:", err);
      return;
    }

    if (!stdout.trim()) {
      console.warn(
        `⚠️ Redis container '${REDIS_CONTAINER_NAME}' is down. Restarting...`
      );

      exec(
        `docker restart ${REDIS_CONTAINER_NAME}`,
        (restartErr, restartStdout) => {
          if (restartErr) {
            console.error("❌ Failed to restart Redis:", restartErr);
          } else {
            console.log("✅ Redis restarted successfully:", restartStdout);
            setTimeout(restoreRedisJobs, 5000); // Wait a few seconds before restoring jobs
          }
        }
      );
    } else {
      console.log("✅ Redis container is already running.");
    }
  });
}

async function restoreRedisJobs() {
  try {
    console.log("🔄 Checking for missed holiday jobs...");

    // 🔍 Find all "scheduled" jobs in MongoDB (only `holidayEnd`)
    const pendingJobs = await holidayTimers.find({
      status: "scheduled",
      redisJobId: { $ne: null }, // Ensure there's a Redis job ID
    });

    for (const job of pendingJobs) {
      const delay = new Date(job.endDate).getTime() - Date.now();

      if (delay > 0) {
        // Re-add the "holidayEnd" job to Redis queue
        const newJob = await holidayQueue.add(
          "holidayEnd",
          {
            userId: job.userId,
            guildId: job.guildId,
            startDate: job.startDate,
            endDate: job.endDate,
          },
          { delay }
        );

        console.log(
          `✅ Restored holidayEnd job for ${job.userId}, New Job ID: ${newJob.id}`
        );

        // 📝 Update MongoDB with new Redis job ID
        await holidayTimers.updateOne(
          { _id: job._id },
          { redisJobId: newJob.id }
        );
      } else {
        // 🗑️ If job is already expired, mark it as complete
        console.warn(`⚠️ Expired job for ${job.userId}, marking as complete.`);
        await holidayTimers.updateOne({ _id: job._id }, { status: "complete" });
      }
    }
  } catch (error) {
    console.error("❌ Error restoring jobs:", error);
  }
}

module.exports = { restoreHolidayTimers };
