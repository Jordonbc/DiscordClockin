const { Worker } = require("bullmq");
const redisClient = require("../utils/redis/redisClient");
const connectToDatabase = require("../utils/database/db");
const {
  handleHolidayStart,
  handleHolidayEnd,
} = require("../utils/holiday/holidayHandler");

module.exports = (client) => {
  console.log("✅ Holiday worker initialized.");

  const holidayWorker = new Worker(
    "holidayQueue",
    async (job) => {
      try {
        await connectToDatabase();

        switch (job.name) {
          case "holidayStart":
            await handleHolidayStart(job, client);
            break;
          case "holidayEnd":
            await handleHolidayEnd(job, client);
            break;
          default:
            console.log(`⚠️ Unknown job type: ${job.name}`);
        }
      } catch (error) {
        console.error("❌ Error processing holiday job:", error);
      }
    },
    { connection: redisClient }
  );

  holidayWorker.on("error", (err) => {
    console.error("❌ Worker Error:", err);
  });

  console.log("🚀 Holiday worker is running...");
};
