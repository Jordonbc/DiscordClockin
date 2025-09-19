const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Role = require("../models/roles.js");

module.exports = {
  id: "roleList_categorys_selectMenu",
  default_member_permissions: "Administrator",
  run: async (client, interaction) => {
    const roles = await Role.findOne({ guildId: interaction.guild.id });

    roles.categorys.forEach((role) => {
      if (interaction.values[0] == role) {
        const firstRole = roles.roles.filter(
          (role) => role.category === interaction.values[0]
        )[0];
        const nextRole = roles.roles.filter(
          (role) => role.category === interaction.values[0]
        )[1];

        let hourlySalaryString = "";
        for (const [level, salary] of firstRole.hourlySalary) {
          if (level !== undefined && salary !== undefined) {
            hourlySalaryString += `${level}: £${salary}p\n`;
          }
        }

        const embed = new EmbedBuilder()
          .setColor("Green")
          .addFields(
            {
              name: "👨‍💼 Role name",
              value: "```" + firstRole.name + "```",
              inline: true,
            },
            {
              name: "💷 Hourly salary",
              value: "```" + hourlySalaryString + "```",
              inline: true,
            },
            {
              name: "Category",
              value: "```" + firstRole.category + "```",
              inline: true,
            },
            {
              name: "🆔 Role ID",
              value: "```" + firstRole.id + "```",
              inline: true,
            }
          )
          .setFooter({ text: "1" });

        const rowEdit = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("edit_role_button")
            .setLabel("Edit")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("delete_role_button")
            .setLabel("Delete")
            .setStyle(ButtonStyle.Danger)
        );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("back_rolelist")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("page_rolelist")
            .setLabel("1")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("next_rolelist")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(nextRole ? false : true)
        );

        interaction.update({
          embeds: [embed],
          components: [interaction.message.components[0], rowEdit, row],
        });
      }
    });
  },
};
