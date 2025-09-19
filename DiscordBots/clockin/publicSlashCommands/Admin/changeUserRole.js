const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const Workers = require("../../models/worker.js");
const Roles = require("../../models/roles.js");

module.exports = {
  name: "change-role",
  description: "» Change a role from a user",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  plan: "Basic",
  category: "Admin",
  default_member_permissions: "Administrator",
  options: [
    {
      name: "user",
      description: "Which user you want to change his role?",
      type: 6,
      required: true,
    },
    {
      name: "roleid",
      description: "Which role you want to add?",
      type: 3,
      required: true,
    },
    {
      name: "experience",
      description: "Which experience do the user have?",
      type: 3,
      choices: [
        {
          name: "Trial",
          value: "trial",
          type: 3,
        },
        {
          name: "Junior",
          value: "junior",
          type: 3,
        },
        {
          name: "Mid",
          value: "mid",
          type: 3,
        },
        {
          name: "Senior",
          value: "senior",
          type: 3,
        },
      ],
      required: true,
    },
  ],
  run: async (client, interaction) => {
    const user = interaction.options.get("user").user;
    const roleId = interaction.options.get("roleid").value;
    const experience = interaction.options.get("experience").value;

    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    const role = roles.roles.find((role) => role.id === roleId);

    if (!role) {
      interaction.reply({
        content: "I don't found any role with that ID",
        ephemeral: true,
      });
    } else {
      const upperCaseExperience =
        experience.charAt(0).toUpperCase() + experience.slice(1);
      if (role.hourlySalary[upperCaseExperience] === undefined) {
        interaction.reply({
          content:
            "That role doesn't have that experience in the hourly salary list",
          ephemeral: true,
        });
      } else {
        const workers = await Workers.findOne({
          guildId: interaction.guild.id,
        });
        const worker = workers.workers.find(
          (worker) => worker.userId === user.id
        );

        if (!worker) {
          interaction.reply({
            content: "This user isn't a worker",
            epehemeral: true,
          });
        } else {
          worker.experience = upperCaseExperience;
          worker.roleId = roleId;
          await workers.save();

          const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(
              `I successfully set the role from ${user} to **${upperCaseExperience} ${role.name}**.`
            );

          interaction.reply({ embeds: [embed], epehemeral: true });
        }
      }
    }
  },
};
