const { EmbedBuilder, time } = require("discord.js");
const client = require("../../index.js");
const cron = require("cron");
const Worker = require("../../models/worker.js");
const Guild = require("../../models/guildSettings.js");
const Roles = require("../../models/roles.js");
const Holidays = require("../../models/holidaysTimers.js");

module.exports = async (client) => {
  // let posting = new cron.CronJob("00 00 18 * * 0", async () => {
  //   const guilds = await Guild.find();
  //   for (guild of guilds) {
  //     const workers = await Worker.findOne({ guildId: guild.guildId });
  //     const roles = await Roles.findOne({ guildId: guild.guildId });
  //     const guild2 = client.guilds.cache.get(guild.guildId);
  //     if (workers?.workers)
  //       for (worker of workers.workers) {
  //         let user = client.users.cache.get(worker.userId);
  //         if (!user) continue;
  //         const role = roles.roles.find((role) => role.id === worker.roleId);
  //         const hours_weekly = Math.floor(worker.weeklyWorked);
  //         const minutes_weekly = Math.floor(
  //           (worker.weeklyWorked - hours_weekly) / 0.01666667
  //         );
  //         let description = "";
  //         for (let i = 0; i < worker.clockDates.clockOut.length; i++) {
  //           description += `- **Clocked in** ${time(
  //             Math.floor(worker.clockDates?.clockIn[i] / 1000),
  //             "f"
  //           )} | **Clocked Out** ${time(
  //             Math.floor(worker.clockDates.clockOut[i] / 1000),
  //             "f"
  //           )}\n`;
  //         }
  //         if (description === "") {
  //           description = "**You dont worked this week**\n";
  //         }

  //         const today = new Date();
  //         const sevenDaysAgo = new Date();
  //         sevenDaysAgo.setDate(today.getDate() - 7);

  //         const userHolidays = await Holidays.find({
  //           userId: worker.userId,
  //           guildId: guild.guildId,
  //           endDate: { $gte: sevenDaysAgo, $lt: today }, // endDate liegt innerhalb der letzten 7 Tage
  //           startDate: { $lte: today }, // startDate liegt nicht in der Zukunft
  //         });
  //         if (userHolidays) {
  //           description += "\n";
  //           for (let holiday of userHolidays) {
  //             description += `- **Holidays start** ${time(
  //               holiday.startDate,
  //               "f"
  //             )} | **Holidays end** ${time(holiday.endDate, "f")}\n`;
  //           }
  //         }

  //         let salary = 0;
  //         if (role) {
  //           const hourlyRate = role.hourlySalary.get(worker.experience);
  //           salary = Math.floor(worker.weeklyWorked * hourlyRate * 100) / 100;
  //         }

  //         salary = Math.floor(salary * 100) / 100;
  //         const embed = new EmbedBuilder()
  //           .setTitle(`**Hello ${user.username}**`)
  //           .setColor("00FFFF")
  //           .setDescription(
  //             `Here is your weekly report from **Monday** to **Sunday**\n\n${description}`
  //           )
  //           .setFooter({ text: guild2.name, iconURL: guild2.iconURL() })
  //           .addFields(
  //             {
  //               name: "Hours worked:",
  //               value: "```" + `${hours_weekly}h ${minutes_weekly}m` + "```",
  //             },
  //             { name: "Revenue:", value: "```£" + salary + "p```" }
  //           );
  //         try {
  //           user.send({ embeds: [embed] });
  //           if (worker.clockDates.clockOut.length == 0) {
  //             user.send({
  //               content: "**IMPORTANT:** You not clocked in this week!",
  //             });
  //             const inactivityEmbed = new EmbedBuilder()
  //               .setColor("Red")
  //               .setTitle("Inactivity")
  //               .setDescription(`${user} not clocked in this week!`);

  //             if (guild.logChannelId) {
  //               const log = guild2.channels.cache.get(guild.logChannelId);

  //               log.send({ embeds: [inactivityEmbed] });
  //             }
  //           }
  //         } catch (error) {
  //           console.log(error);
  //           console.log(`Failed to send ${user.username} a dm`);
  //         }
  //       }
  //   }
  // });

  // posting.start();
  console.log("Personal weekly notifications will be implemented soon!");
};
