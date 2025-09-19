const {
  EmbedBuilder,
  time,
  ApplicationCommandType,
  ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");
const Workers = require("../../models/worker.js");
const Roles = require("../../models/roles.js");
const Clockins = require("../../models/clockins.js");

module.exports = {
  name: "a-profile",
  description: "» Check the profile from a user (Bot Admin)",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "",
  options: [
    {
      name: "user",
      description: "Choose the user",
      type: 6,
      required: false,
    },
  ],
  run: async (client, interaction) => {
    await interaction.deferReply({ flags: 64 });

    if (!interaction?.guild)
      return interaction.editReply({
        content: "Please run this command on a server!",
      });

    let userobj = interaction.options.get("user")?.user || interaction.user;

    const workers = await Workers.findOne({ guildId: interaction.guild.id });
    const user = workers.workers.find((worker) => worker.userId === userobj.id);

    const notFound = new EmbedBuilder()
      .setColor("#FF0000")
      .setDescription("This user isn't a worker here.");

    if (!user) return interaction.editReply({ embeds: [notFound] });

    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    const role = roles.roles.find((role) => role.id === user.roleId);

    const hours_daily = Math.floor(user.dailyWorked);
    const minutes_daily = Math.floor(
      (user.dailyWorked - hours_daily) / 0.01666667
    );

    const hours_weekly = Math.floor(user.weeklyWorked);
    const minutes_weekly = Math.floor(
      (user.weeklyWorked - hours_weekly) / 0.01666667
    );

    const hours_total = Math.floor(user.totalWorked);
    const minutes_total = Math.floor(
      (user.totalWorked - hours_total) / 0.01666667
    );
    let salary = 0;

    if (user.experience == "Junior") {
      salary =
        Math.floor(user.weeklyWorked * role.hourlySalary.Junior * 100) / 100;
    } else if (user.experience == "Mid") {
      salary =
        Math.floor(user.weeklyWorked * role.hourlySalary.Mid * 100) / 100;
    } else if (user.experience == "Senior") {
      salary =
        Math.floor(user.weeklyWorked * role.hourlySalary.Senior * 100) / 100;
    } else {
      salary =
        Math.floor(user.weeklyWorked * role.hourlySalary.Trial * 100) / 100;
    }

    let fullSalary = 0;

    if (user.experience == "Junior") {
      salary =
        Math.floor(user.totalWorked * role.hourlySalary.Junior * 100) / 100;
    } else if (user.experience == "Mid") {
      salary = Math.floor(user.totalWorked * role.hourlySalary.Mid * 100) / 100;
    } else if (user.experience == "Senior") {
      salary =
        Math.floor(user.totalWorked * role.hourlySalary.Senior * 100) / 100;
    } else {
      salary =
        Math.floor(user.totalWorked * role.hourlySalary.Trial * 100) / 100;
    }

    let description = "";
    for (let i = 0; i < user.clockDates.clockIn.length; i++) {
      description += `- **Clocked in** ${time(
        Math.floor(user.clockDates.clockIn[i] / 1000),
        "f"
      )} | **Clocked Out** ${time(
        Math.floor(user.clockDates.clockOut[i] / 1000),
        "f"
      )}\n`;
    }
    if (description === "") {
      description = "**This user dont worked this week**";
    }

    let brakes = "";
    for (let i = 0; i < user.afkDates.afkIn.length; i++) {
      brakes += `- **Break start** ${time(
        Math.floor(user.afkDates.afkIn[i] / 1000),
        "f"
      )} | **Break end** ${time(
        Math.floor(user.afkDates.afkOut[i] / 1000),
        "f"
      )}\n`;
    }
    if (brakes === "") {
      brakes = "**This user has no current break**";
    }

    const userClockins = await Clockins.find({
      userId: userobj.id,
      guildId: interaction.guild.id,
    });

    const found = new EmbedBuilder()
      .setTitle(`${userobj.tag}‘s Profile`)
      .setColor("Green")
      .setFooter({ text: userobj.id })
      .addFields(
        {
          name: "Role:",
          value:
            "```" +
            (user.experience ? user.experience + " " : "") +
            (role ? role.name : "No role found") +
            "```",
          inline: true,
        },
        { name: "Status:", value: "```" + user.status + "```", inline: true },
        { name: "Balance:", value: "```£" + salary + "p```", inline: true },
        {
          name: "Department:",
          value: "```" + role.category + "```",
          inline: false,
        },
        {
          name: "Today worked:",
          value: "```" + `${hours_daily}h ${minutes_daily}m` + "```",
          inline: true,
        },
        {
          name: "This week worked:",
          value: "```" + `${hours_weekly}h ${minutes_weekly}m` + "```",
          inline: true,
        },
        {
          name: "Total worked:",
          value: "```" + `${hours_total}h ${minutes_total}m` + "```",
          inline: true,
        },
        { name: "Clock dates:", value: description, inline: false },
        { name: "Break date:", value: brakes, inline: false },
        {
          name: "Full balance:",
          value: "```£" + fullSalary + "p```",
          inline: true,
        }
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Clock out")
        .setStyle("Danger")
        .setDisabled(user.status === "Offline" ? true : false)
        .setCustomId("manageUser_clockout_button"),

      new ButtonBuilder()
        .setLabel("Reset Clockins")
        .setStyle("Primary")
        .setDisabled(user.clockDates.clockIn.length <= 0 ? true : false)
        .setCustomId("manageUser_reset_clockins_button"),

      new ButtonBuilder()
        .setLabel(`Reset message IDs (${userClockins.length})`)
        .setStyle("Primary")
        .setDisabled(userClockins.length <= 0 ? true : false)
        .setCustomId("manageUser_reset_messageIds_button")
    );

    interaction.editReply({ embeds: [found], components: [buttons] });
  },
};
