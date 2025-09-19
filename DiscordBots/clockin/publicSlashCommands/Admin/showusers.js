const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const Roles = require("../../models/roles.js");
const Worker = require("../../models/worker.js");
const emojiFromText = require("emoji-from-text");

module.exports = {
  name: "showusers",
  description: "» Show the list of all registered users",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  guildOnly: true,
  plan: "Basic",
  category: "Admin",
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const users = await Worker.findOne({ guildId: interaction.guild.id });
    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    let currentFieldsCount = 0;
    const embeds = [];
    let embed = new EmbedBuilder()
      .setColor("00FFFF")
      .setTitle("**__ALL USERS__**");
    for (category of roles.categorys) {
      const categoryRoles = roles.roles.filter(
        (role) => role.category === category
      );
      let userList = "";
      let roleList = "";
      let idList = "";
      let categoryCount = 0;
      for (categoryRole of categoryRoles) {
        const userWithRole = users.workers.filter(
          (worker) => worker.roleId === categoryRole.id
        );
        for (user of userWithRole) {
          const dcUser = await client.users.cache.get(user.userId);
          userList += `${dcUser}\n`;
          roleList += `${categoryRole.name}\n`;
          idList += `${user.userId}\n`;
          categoryCount++;
        }
      }
      if (currentFieldsCount > 22) {
        embeds.push(embed);
        embed = new EmbedBuilder().setColor("#00FFFF");
        currentFieldsCount = 0;
      }
      embed.addFields({
        name: "\u200B",
        value:
          "```" +
          emojiFromText(category)[0].match.emoji.char +
          " " +
          category +
          " [" +
          categoryCount +
          "]```",
      });
      if (userList !== "") {
        embed.addFields(
          {
            name: "**USER**",
            inline: true,
            value: userList,
          },
          {
            name: "**ROLE**",
            inline: true,
            value: roleList,
          },
          {
            name: "**ID**",
            inline: true,
            value: idList,
          }
        );
      }
      currentFieldsCount += 4;
    }
    let userList = "";
    let roleList = "";
    let idList = "";
    let categoryCount = 0;
    for (user of users.workers) {
      const role = roles.roles.find((role) => role.id === user.roleId);
      if (!role) {
        const dcUser = await client.users.cache.get(user.userId);
        userList += `${dcUser}\n`;
        roleList += `?\n`;
        idList += `${user.userId}\n`;
        categoryCount++;
      }
    }
    if (currentFieldsCount > 22) {
      embeds.push(embed);
      embed = new EmbedBuilder().setColor("#00FFFF");
      currentFieldsCount = 0;
    }
    embed.addFields({
      name: "\u200B",
      value:
        "```" +
        emojiFromText("Role not found")[0].match.emoji.char +
        " " +
        "Role not found" +
        " [" +
        categoryCount +
        "]```",
    });
    if (userList !== "") {
      embed.addFields(
        {
          name: "**USER**",
          inline: true,
          value: userList,
        },
        {
          name: "**ROLE**",
          inline: true,
          value: roleList,
        },
        {
          name: "**ID**",
          inline: true,
          value: idList,
        }
      );
    }
    embeds.push(embed);

    interaction.editReply({ embeds: embeds, ephemeral: true });
  },
};
