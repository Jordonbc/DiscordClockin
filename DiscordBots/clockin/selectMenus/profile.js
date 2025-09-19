const { EmbedBuilder, time } = require("discord.js");
const Workers = require("../models/worker.js");
const Roles = require("../models/roles.js");
const Holidays = require("../models/holidaysTimers.js");
const config = require("../config.json");

module.exports = {
  id: "profile_selectMenu",
  run: async (client, interaction) => {
    const footer = interaction.message.embeds[0].footer;
    const guildWorkers = await Workers.findOne({
      guildId: interaction.guild.id,
    });
    const worker = guildWorkers.workers.find(
      (worker) => worker.userId === footer.text
    );

    if (interaction.values[0] === "clockins") {
      let description = "";
      for (let i = 0; i < worker.clockDates.clockIn.length; i++) {
        description += `- **Clocked in** ${time(
          Math.floor(worker.clockDates.clockIn[i] / 1000),
          "f"
        )} | **Clocked Out** ${
          worker.clockDates.clockOut[i]
            ? time(Math.floor(worker.clockDates.clockOut[i] / 1000), "f")
            : "-"
        }\n`;
      }
      if (description === "") {
        description = "**This user dont worked this week**";
      }

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(description)
        .setFooter(footer)
        .setTitle("**__CLOCK INS__**");

      interaction.update({ embeds: [embed] });
    } else if (interaction.values[0] === "holidays") {
      const userHolidays = await Holidays.find({
        guildId: interaction.guild.id,
        userId: worker.userId,
      });
      let description = "";
      for (holidays of userHolidays) {
        description += `- **Time off start** ${time(
          holidays.startDate,
          "f"
        )} | **Time off end** ${time(holidays.endDate, "f")}\n`;
      }

      if (description === "") {
        description = "`This user has no registered time offs in the future.`";
      }

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle("**__TIME OFFS__**")
        .setDescription(description)
        .setFooter(footer);

      interaction.update({ embeds: [embed] });
    } else if (interaction.values[0] === "balance") {
      const roles = await Roles.findOne({ guildId: interaction.guild.id });
      const role = roles.roles.find((role) => role.id === worker.roleId);

      const hourlyRate = role.hourlySalary.get(worker.experience);

      const dailySalary =
        Math.floor(worker.dailyWorked * hourlyRate * 100) / 100;
      const salary = Math.floor(worker.weeklyWorked * hourlyRate * 100) / 100;
      const fullSalary =
        Math.floor(worker.totalWorked * hourlyRate * 100) / 100;

      if (!config.balanceThumbnailUrl) {
        throw new Error("Missing balanceThumbnailUrl in config.json");
      }

      const embed = new EmbedBuilder()
        .setTitle(`**__BALANCE__**`)
        .setThumbnail(config.balanceThumbnailUrl)
        .setColor("#81e6ff")
        .addFields(
          {
            name: "Today balance:",
            value: "```£" + dailySalary + "p```",
            inline: true,
          },
          {
            name: "Weekly balance:",
            value: "```£" + salary + "p```",
            inline: true,
          },
          {
            name: "Full balance:",
            value: "```£" + fullSalary + "p```",
            inline: true,
          }
        )
        .setFooter(footer);

      interaction.update({ embeds: [embed] });
    }
  },
};
