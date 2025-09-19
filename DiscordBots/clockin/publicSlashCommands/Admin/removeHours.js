const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const Worker = require("../../models/worker.js");

module.exports = {
  name: "removehours",
  description: "» Manually remove hours from a user's total.",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  plan: "Basic",
  guildOnly: true,
  category: "Admin",
  default_member_permissions: "Administrator",
  options: [
    {
      name: "user",
      description: "Which user you would add hours?",
      type: 6,
      required: true,
    },
    {
      name: "mask",
      description: "Which mask?",
      type: 3,
      required: true,
      choices: [
        {
          name: "Daily",
          value: "mask_daily_choices",
        },
        {
          name: "Weekly",
          value: "mask_weekly_choices",
        },
        {
          name: "Total",
          value: "mask_total_choices",
        },
      ],
    },
    {
      name: "hours",
      description: "The amount of hours (e.g., 16h 12m)",
      type: 3, // STRING type
      required: true,
    },
  ],
  run: async (client, interaction) => {
    const member = interaction.options.getUser("user");
    const mask = interaction.options.getString("mask");
    const hoursInput = interaction.options.getString("hours");

    // Convert the input to hours
    const timeRegex = /(\d+h)?\s*(\d+m)?/;
    const match = timeRegex.exec(hoursInput);

    let totalHours = 0;
    if (match) {
      const hoursPart = match[1] ? parseInt(match[1].replace("h", "")) : 0;
      const minutesPart = match[2] ? parseInt(match[2].replace("m", "")) : 0;
      totalHours = hoursPart + minutesPart / 60;
      if (!hoursPart && !minutesPart)
        return interaction.reply({
          content:
            "Invalid time format. Please use the format `Xh Ym` (e.g., `16h 12m`).",
          ephemeral: true,
        });
    } else {
      return interaction.reply({
        content:
          "Invalid time format. Please use the format `Xh Ym` (e.g., `16h 12m`).",
        ephemeral: true,
      });
    }

    const workers = await Worker.findOne({ guildId: interaction.guild.id });
    const worker = workers.workers.find(
      (worker) => worker.userId === member.id
    );

    const notWorker = new EmbedBuilder()
      .setColor("#FF0000")
      .setDescription("This user isn't a worker");

    if (!worker)
      return interaction.reply({ embeds: [notWorker], ephemeral: true });

    const oldHoursDaily = worker.dailyWorked;
    const oldHoursWeekly = worker.weeklyWorked;
    const oldHoursTotal = worker.totalWorked;

    if (mask === "mask_daily_choices") {
      worker.dailyWorked -= totalHours;
      worker.weeklyWorked -= totalHours;
      worker.totalWorked -= totalHours;
    } else if (mask === "mask_weekly_choices") {
      worker.weeklyWorked -= totalHours;
      worker.totalWorked -= totalHours;
    } else if (mask === "mask_total_choices") {
      worker.totalWorked -= totalHours;
    }

    await workers.save();

    const embed = new EmbedBuilder()
      .setTitle("➕ | **__REMOVE HOURS__**")
      .setDescription(
        `Successfully removed **${totalHours.toFixed(
          2
        )}** hours from ${member}!\n\n\`${oldHoursDaily.toFixed(2)}h\` - \`${
          mask === "mask_daily_choices" ? totalHours.toFixed(2) : 0
        }h\` => \`${worker.dailyWorked.toFixed(
          2
        )}h\` (Daily)\n\`${oldHoursWeekly.toFixed(2)}h\` - \`${
          mask === "mask_weekly_choices" ? totalHours.toFixed(2) : 0
        }h\` => \`${worker.weeklyWorked.toFixed(
          2
        )}h\` (Weekly)\n\`${oldHoursTotal.toFixed(2)}h\` - \`${
          mask === "mask_total_choices" ? totalHours.toFixed(2) : 0
        }h\` => \`${worker.totalWorked.toFixed(2)}h\` (Total)`
      )
      .setColor("#81e6ff");

    interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
