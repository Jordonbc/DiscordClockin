const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const guildSchema = require("../../models/guildSettings.js");

module.exports = {
  name: "set-target",
  description: "» Allows admins to set or modify a user's weekly hours target.",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  plan: "Pro",
  category: "Setup",
  guildOnly: true,
  options: [
    {
      name: "hours",
      description: "The target amount of hours",
      type: 4,
      required: true,
    },
  ],
  run: async (client, interaction) => {
    await interaction.deferReply();
    const hours = interaction.options.getInteger("hours");

    const guild = await guildSchema.findOne({ guildId: interaction.guild.id });

    if (!guild) {
      const newGuild = new guildSchema({
        guildId: interaction.guild.id,
        targetHours: hours,
      });
      await newGuild.save();
    } else {
      guild.targetHours = hours;
      await guild.save();
    }

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`I successfully set the target hours to **${hours}**.`);

    interaction.editReply({ embeds: [embed] });
  },
};
