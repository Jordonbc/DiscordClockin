const {
  EmbedBuilder,
  time,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const afkPresences = require("../models/afkPresences.js");
const afkReminders = require("../models/afkReminders.js");
const clockins = require("../models/clockins.js");
const Workers = require("../models/worker.js");
const guildDB = require("../models/guildSettings.js");
const Roles = require("../models/roles.js");
const Holidays = require("../models/holidaysTimers.js");
const { updateClockInMessage } = require("../functions/syncData.js");

module.exports = {
  id: "profile_manage_selectMenu",
  run: async (client, interaction) => {
    if (interaction.values[0] === "clockout") {
      const userId = interaction.message.embeds[0].footer.text;

      const workers = await Workers.findOne({ guildId: interaction.guild.id });
      const worker = workers.workers.find((worker) => worker.userId === userId);
      const user = await client.users.cache.get(userId);

      if (worker.status === "Offline")
        return interaction.reply({
          content: "This user is currently not working.",
          ephemeral: true,
        });

      const dmChannel = await user.createDM();
      const msg = await dmChannel.messages.fetch(worker.clockInMessage);

      const roles = await Roles.findOne({ guildId: workers.guildId });
      const role = roles.roles.find((role) => role.id === worker.roleId);

      if (worker.status === "Break") {
        worker.afkDates.afkOut.push(Date.now());
        worker.breakTime +=
          (worker.afkDates.afkOut[worker.afkDates.afkOut.length - 1] -
            worker.afkDates.afkIn[worker.afkDates.afkOut.length - 1]) /
          1000 /
          60 /
          60;
      }

      worker.worked =
        (Date.now() - msg.createdTimestamp) / 1000 / 60 / 60 - worker.breakTime;

      const hours_worked = Math.floor(worker.worked);
      const minutes_worked = Math.floor(
        (worker.worked - hours_worked) / 0.01666667
      );

      const hours_break = Math.floor(worker.breakTime);
      const minutes_break = Math.floor(
        (worker.breakTime - hours_break) / 0.01666667
      );

      worker.weeklyWorked += worker.worked;
      worker.dailyWorked += worker.worked;
      worker.totalWorked += worker.worked;

      const hours_weekly = Math.floor(worker.weeklyWorked);
      const minutes_weekly = Math.floor(
        (worker.weeklyWorked - hours_weekly) / 0.01666667
      );

      const hourlyRate = role.hourlySalary.get(worker.experience);

      const salary = Math.floor(worker.worked * hourlyRate * 100) / 100;

      function dateFormat(timestamp) {
        const now = new Date(timestamp);
        const londonTime = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/London",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).formatToParts(now);

        const timeParts = Object.fromEntries(
          londonTime.map(({ type, value }) => [type, value])
        );

        const day = timeParts.day;
        const month = timeParts.month;
        const year = timeParts.year;
        const hour = timeParts.hour;
        const minute = timeParts.minute;
        const second = timeParts.second;

        return `${day}/${month}/${year}, ${hour}:${minute}:${second}`;
      }

      const embed = new EmbedBuilder()
        .setTitle("You have clocked out!")
        .addFields(
          {
            name: "Clocked in",
            value: `${dateFormat(msg.createdTimestamp)}`,
            inline: true,
          },
          {
            name: "Clocked out",
            value: `${dateFormat(Date.now())}`,
            inline: true,
          },
          {
            name: "Worked time",
            value: `${hours_worked} hours ${minutes_worked} minutes`,
            inline: true,
          },
          {
            name: "Break time",
            value: `${hours_break} hours ${minutes_break} minutes`,
            inline: true,
          },
          {
            name: "Breaks count",
            value: `${worker.breaksCount}`,
            inline: true,
          },
          {
            name: "Total hours worked (this week)",
            value: `${hours_weekly} hours ${minutes_weekly} minutes`,
            inline: true,
          },
          {
            name: "Revenue",
            value: `£${salary}`,
            inline: true,
          },
          {
            name: "Worker's description",
            value: "Was clocked out by an admin",
            inline: true,
          }
        )
        .setColor("Green");

      const clockOutEmbed = new EmbedBuilder()
        .setDescription("```" + user.id + "```")
        .addFields(
          {
            name: "Session Revenue",
            value: `£${salary}`,
            inline: false,
          },
          {
            name: "User Clocked in",
            value: `${dateFormat(msg.createdTimestamp)}`,
            inline: true,
          },
          {
            name: "Clocked out",
            value: `${dateFormat(Date.now())}`,
            inline: true,
          },
          {
            name: "Worked time",
            value: `${hours_worked} hours ${minutes_worked} minutes`,
            inline: true,
          },
          {
            name: "Break time",
            value: `${hours_break} hours ${minutes_break} minutes`,
            inline: true,
          },
          {
            name: "Breaks count",
            value: `${worker.breaksCount}`,
            inline: true,
          },
          {
            name: "Total hours (this week)",
            value: `${hours_weekly} hours ${minutes_weekly} minutes`,
            inline: true,
          },
          {
            name: "Worker's description",
            value: "Was clocked out by an admin",
            inline: false,
          }
        )
        .setColor("Green")
        .setTimestamp();

      worker.status = "Offline";
      worker.breaksCount = 0;
      worker.afkDates.afkOut = [];
      worker.afkDates.afkIn = [];
      worker.worked = 0;
      worker.breakTime = 0;
      worker.clockDates.clockOut.push(Date.now());
      await workers.save();
      await afkReminders.deleteOne({ messageId: worker.clockInMessage });
      await clockins.deleteOne({ messageId: worker.clockInMessage });
      await afkPresences.deleteOne({
        guildId: interaction.guild.id,
        userId: userId,
      });

      updateClockInMessage(workers.guildId);

      const clockOutWarning = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Warning")
        .setDescription("An admin clocked you out");

      msg.edit({ embeds: [embed], components: [], files: [] });
      dmChannel.send({ embeds: [clockOutWarning] });
      interaction.update({ components: interaction.message.components });

      const guildSettings = await guildDB.findOne({ guildId: workers.guildId });

      if (!guildSettings?.logChannelId) return;

      const guild2 = client.guilds.cache.get(guildSettings.guildId);
      const log = guild2.channels.cache.get(guildSettings.logChannelId);

      embed.setTitle(`${userId.tag} has clocked out!`);

      log.send({ content: `${user}`, embeds: [clockOutEmbed] });
    } else if (interaction.values[0] === "timeoffs") {
      const userHolidays = await Holidays.find({
        guildId: interaction.guild.id,
        userId: interaction.message.embeds[0].footer.text,
      });

      let index = 0;
      let description = "";

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("profile_manage_timeoff_selectMenu")
        .setPlaceholder("🔨 › Which time off you want to manage?");

      for (holidays of userHolidays) {
        index++;
        description += `\`[${index}]\` **Time off start** ${time(
          holidays.startDate,
          "f"
        )} | **Time off end** ${time(holidays.endDate, "f")}\n`;
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${index}`)
            .setValue(`${holidays._id}`)
        );
      }

      const manageRow = new ActionRowBuilder().addComponents(selectMenu);

      if (description === "") {
        const noTimeoffsEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("**__TIME OFFS__**")
          .setDescription(
            "`This user has no registered time offs in the future.`"
          )
          .setFooter(interaction.message.embeds[0].footer);

        return interaction.update({ embeds: [noTimeoffsEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle("**__TIME OFFS__**")
        .setDescription(description)
        .setFooter(interaction.message.embeds[0].footer);

      interaction.update({ embeds: [embed], components: [manageRow] });
    }
  },
};
