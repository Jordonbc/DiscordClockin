const {
  EmbedBuilder,
  PermissionsBitField,
  ApplicationCommandType,
  time,
} = require("discord.js");
const Worker = require("../../models/worker.js");
const Roles = require("../../models/roles.js");

module.exports = {
  name: "weeeklyreport",
  description: "» Sends the weekly report for a user (template)",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  plan: "Basic",
  category: "Information",
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
    await interaction.deferReply({});

    let userid = interaction.options.get("user")?.user || interaction.user;

    // Make sure that only the user or an admin can check the report for other users
    if (userid.id !== interaction.user.id) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      )
        return interaction.editReply({
          content:
            "You are not permitted to use this command on other users! To check other users, you need `Administrator` Permissions",
          ephemeral: true,
        });
    }

    const workers = await Worker.findOne({ guildId: interaction.guild.id });
    const user = workers.workers.find((worker) => worker.userId === userid.id);

    const notFound = new EmbedBuilder()
      .setColor("#FF0000")
      .setDescription("No user found");

    if (!user) return interaction.editReply({ embeds: [notFound] });

    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    const role = roles.roles.find((role) => role.id === user.roleId);

    const hours_weekly = Math.floor(user.weeklyWorked);
    const minutes_weekly = Math.floor(
      (user.weeklyWorked - hours_weekly) / 0.01666667
    );

    let description = "";
    // Loop through the clock dates and add them to the description
    for (let i = 0; i < user.clockDates.clockOut.length; i++) {
      description += `- **Clocked in** ${time(
        Math.floor(user.clockDates.clockIn[i] / 1000),
        "f"
      )} | **Clocked Out** ${time(
        Math.floor(user.clockDates.clockOut[i] / 1000),
        "f"
      )}\n`;
    }

    // If the user has not worked this week, set the description to a default message
    if (description === "") {
      description = "**You have not worked this week**";
    }

    const hourlyRate = role.hourlySalary.get(user.experience);
    const salary = Math.floor(user.weeklyWorked * hourlyRate * 100) / 100;

    const found = new EmbedBuilder()
      .setTitle(`**Hello ${userid.username}**`)
      .setColor("00FFFF")
      .setDescription(
        `Here is your weekly report from **Monday** to **Sunday**\n\n${description}`
      )
      .addFields(
        {
          name: "Hours worked:",
          value: "```" + `${hours_weekly}h ${minutes_weekly}m` + "```",
        },
        { name: "Revenue:", value: "```£" + salary + "p```" }
      );

    interaction.editReply({ embeds: [found] });
  },
};
