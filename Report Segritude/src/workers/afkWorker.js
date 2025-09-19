const { Worker } = require("bullmq");
const redisClient = require("../utils/redis/redisClient");
const connectToDatabase = require("../utils/database/db");
const {
  handleAfkStart,
  handleAfkEnd,
} = require("../utils/afkSystem/afkHandler");

module.exports = (client) => {
  console.log("✅ Afk worker initialized.");

  const afkWorker = new Worker(
    "afkQueue",
    async (job) => {
      try {
        await connectToDatabase();

        switch (job.name) {
          case "afkStart":
            await handleAfkStart(job, client);
            break;
          case "afkEnd":
            await handleAfkEnd(job, client);
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

  afkWorker.on("error", (err) => {
    console.error("❌ Worker Error:", err);
  });

  console.log("🚀 AFK worker is running...");
};
