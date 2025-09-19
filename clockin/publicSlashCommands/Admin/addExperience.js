const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const Role = require("../../models/roles.js");
const Settings = require("../../models/guildSettings.js");
require("dotenv").config();

const defaultColor = process.env.DEFAULT_COLOR;

module.exports = {
  name: "addexperience",
  deleted: false,
  description: "» Create a new worker experience",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  default_member_permissions: "Administrator",
  plan: "Pro",
  category: "Admin",
  options: [
    {
      name: "name",
      description: "Type in the name of the new experience",
      type: 3,
      required: true,
    },
  ],
  run: async (client, interaction) => {
    await interaction.deferReply();

    const guildSettings = await Settings.findOne({
      guildId: interaction.guild.id,
    });
    let guildRoles = await Role.findOne({ guildId: interaction.guild.id });
    if (!guildRoles) {
      guildRoles = new Role({
        guildId: interaction.guild.id,
      });
    }

    if (guildSettings.plan === "Pro") {
      if (guildRoles?.experiences.length > 10) {
        const maxExperiences = new EmbedBuilder()
          .setDescription(
            `🚫 ${interaction.user}, This server reached the maximum of **10** experiences! Upgrade to the \`Elite\` plan to create more experiences!`
          )
          .setColor("Red");

        return interaction.editReply({ embeds: [maxExperiences] });
      }
    }

    if (guildRoles?.experiences.length >= 25) {
      const maxExperiences = new EmbedBuilder()
        .setDescription(
          `🚫 ${interaction.user}, This server reached the maximum of **25** experiences!`
        )
        .setColor("Red");

      return interaction.editReply({ embeds: [maxExperiences] });
    }

    const name = interaction.options.getString("name");

    if (guildRoles.experiences.includes(name)) {
      const alreadyCreated = new EmbedBuilder()
        .setDescription(
          `🚫 ${interaction.user}, This experience already exists, you can't create two experiences with the same name!`
        )
        .setColor("Red");

      return interaction.editReply({ embeds: [alreadyCreated] });
    }

    guildRoles.experiences.push(name);
    await guildRoles.save();

    const embed = new EmbedBuilder()
      .setColor(defaultColor)
      .setDescription(
        `<:rocketlunch:1256286588233842708> You successfully created a new experience with the name \`${name}\``
      );

    interaction.editReply({ embeds: [embed] });
  },
};
