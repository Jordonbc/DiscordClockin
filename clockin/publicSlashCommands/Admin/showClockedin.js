const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const Roles = require("../../models/roles.js");
const Worker = require("../../models/worker.js");
const emojiFromText = require("emoji-from-text");
require("dotenv").config();

const defaultColor = process.env.DEFAULT_COLOR;

module.exports = {
  name: "showclockedin",
  description: "» Show the list of all clocked in users",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  guildOnly: true,
  plan: "Basic",
  category: "Admin",
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    let users = await Worker.findOne({ guildId: interaction.guild.id });
    users = users.workers.filter(
      (worker) => worker.status === "Work" || worker.status === "Break"
    );
    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    let currentFieldsCount = 0;
    let userList = "";
    let timeList = "";
    let revenue = "";
    const embeds = [];
    let embed = new EmbedBuilder()
      .setColor(defaultColor)
      .setTitle("**__ALL USERS__**");
    for (worker of users) {
      const dcUser = await client.users.cache.get(worker.userId);
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
        (Date.now() -
          worker.clockDates.clockIn[worker.clockDates.clockIn.length - 1]) /
          1000 /
          60 /
          60 -
        worker.breakTime;

      const hours_worked = Math.floor(worker.worked);
      const minutes_worked = Math.floor(
        (worker.worked - hours_worked) / 0.01666667
      );

      const hourlyRate = role.hourlySalary.get(worker.experience);
      const salary = Math.floor(worker.worked * hourlyRate * 100) / 100;

      userList += `${dcUser}\n`;
      timeList += `[**${hours_worked}h ${minutes_worked}m**]\n`;
      revenue += `£${salary}p\n`;
      if (currentFieldsCount > 22) {
        embed.addFields(
          {
            name: "**USER**",
            inline: true,
            value: userList,
          },
          {
            name: "**HOURS**",
            inline: true,
            value: timeList,
          },
          {
            name: "**REVENUE**",
            inline: true,
            value: revenue,
          }
        );
        embeds.push(embed);
        embed = new EmbedBuilder().setColor(defaultColor);
        currentFieldsCount = 0;
      }
      currentFieldsCount += 4;
    }
    embed.addFields(
      {
        name: "**USER**",
        inline: true,
        value: userList,
      },
      {
        name: "**HOURS**",
        inline: true,
        value: timeList,
      },
      {
        name: "**REVENUE**",
        inline: true,
        value: revenue,
      }
    );
    embeds.push(embed);

    interaction.editReply({ embeds: embeds, ephemeral: true });
  },
};
