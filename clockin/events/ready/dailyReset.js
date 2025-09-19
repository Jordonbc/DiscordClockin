const cron = require("cron");
const Worker = require("../../models/worker.js");
const Role = require("../../models/roles.js");

module.exports = async (client) => {
  let dailyResetJob = new cron.CronJob("00 00 00 * * *", async () => {
    try {
      const guilds = await Worker.find();

      for (const guild of guilds) {
        for (const worker of guild.workers) {
          worker.dailyWorked = 0;
        }
        await guild.save();
      }

      console.log("Daily worked hours reset successfully.");
    } catch (error) {
      console.error("Error resetting daily worked hours:", error);
    }
  });

  dailyResetJob.start();
};
