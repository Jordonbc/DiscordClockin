const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const Role = require("../../models/roles.js");

module.exports = {
  id: "next_rolelist",
  //permissions: [],
  run: async (client, interaction) => {
    const number = parseInt(interaction.message.embeds[0].footer.text, 10);
    const category = interaction.message.embeds[0].fields[2].value.slice(3, -3);

    const roles = await Role.findOne({ guildId: interaction.guild.id });

    const role = roles.roles.filter((role) => role.category === category)[
      number
    ];
    const nextRole = roles.roles.filter((role) => role.category === category)[
      number + 1
    ];

    if (!role) {
      return interaction.update({
        content:
          ":x: **ERROR:** *You deleted a role, please use the command again.*",
        embeds: [],
        components: [],
      });
    }

    let hourlySalaryString = "";
    for (const [level, salary] of role.hourlySalary) {
      if (level !== undefined && salary !== undefined) {
        hourlySalaryString += `${level}: £${salary}p\n`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor("Green")
      .addFields(
        {
          name: "<:icon_manage:1337377942883401780> Role name",
          value: "```" + role.name + "```",
          inline: true,
        },
        {
          name: "<:icon_pound:1337326268139700247> Hourly salary",
          value: "```" + hourlySalaryString + "```",
          inline: true,
        },
        {
          name: "Category",
          value: "```" + role.category + "```",
          inline: true,
        },
        {
          name: "<:icon_id:1337377956313436210> Role ID",
          value: "```" + role.id + "```",
          inline: true,
        }
      )
      .setFooter({ text: `${number + 1}` });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back_rolelist")
        .setLabel("Back")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(false),
      new ButtonBuilder()
        .setCustomId("page_rolelist")
        .setLabel(`${number + 1}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("next_rolelist")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(nextRole ? false : true)
    );
    interaction.update({
      embeds: [embed],
      components: [
        interaction.message.components[0],
        interaction.message.components[1],
        row,
      ],
    });
  },
};
