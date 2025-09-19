const { ActivityType } = require("discord.js");
const client = require("../../index.js");
const chalk = require("chalk");
const Workers = require("../../models/worker.js");
// const insertData = require("../insertRoles.js");
const { restoreHolidayTimers } = require("../../functions/holidays.js");
// const performanceMonitor = require("../functions/performanceMonitor.js");

async function getUsersCount() {
  const workerGuilds = await Workers.find();
  let count = 0;
  for (guild of workerGuilds) {
    count += guild.workers.length;
  }
  return count;
}

module.exports = async (client) => {
  const activities = [
    { name: `clock in`, type: ActivityType.Listening },
    { name: `Lunaris`, type: ActivityType.Playing },
    { name: `${await getUsersCount()} Users`, type: ActivityType.Watching },
    { name: `Segritude Games`, type: ActivityType.Competing },
  ];
  const status = ["online", "online", "online"];
  let i = 0;
  setInterval(() => {
    if (i >= activities.length) i = 0;
    client.user.setActivity(activities[i]);
    i++;
  }, 5000);

  let s = 0;
  setInterval(() => {
    if (s >= activities.length) s = 0;
    client.user.setStatus(status[s]);
    s++;
  }, 30000);
  console.log(chalk.red(`Logged in as ${client.user.tag}!`));
  // restoreHolidayTimers();
};
