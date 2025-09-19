const { EmbedBuilder } = require("discord.js");
const dateFormat = require("../../functions/clockout/dateFormat");
const calculateSalary = require("../../functions/calculateSalary");

async function generateEmbed(
  interaction,
  worker,
  workers,
  workerRole,
  workersDescription
) {
  //Calculate session data
  const {
    hours_worked,
    minutes_worked,
    hours_break,
    minutes_break,
    hours_weekly,
    minutes_weekly,
    salary,
  } = await calculateSalary(interaction, worker, workers, workerRole);

  const embed = new EmbedBuilder()
    .setTitle("You have clocked out!")
    .addFields(
      {
        name: "Clocked in",
        value: `${dateFormat(interaction.message.createdTimestamp)}`,
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
        value: workersDescription,
        inline: true,
      }
    )
    .setColor("Green");

  const clockOutEmbed = new EmbedBuilder()
    .setDescription("```" + interaction.user.id + "```")
    .addFields(
      {
        name: "Session Revenue",
        value: `£${salary}`,
        inline: false,
      },
      {
        name: "User Clocked in",
        value: `${dateFormat(interaction.message.createdTimestamp)}`,
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
        value: workersDescription,
        inline: false,
      }
    )
    .setColor("Green")
    .setTimestamp();

  return { embed, clockOutEmbed };
}

module.exports = generateEmbed;
