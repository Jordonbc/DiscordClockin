const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const guildSchema = require("../../models/guildSettings.js");

module.exports = {
  name: "breaktime",
  description: "» Enables admins to adjust the time limit for break time.",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  plan: "Pro",
  category: "Setup",
  default_member_permissions: "Administrator",
  options: [
    {
      name: "hours",
      description: "The max amount of afk hours",
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
        maxAfkHours: hours,
      });
      await newGuild.save();
    } else {
      guild.maxAfkHours = hours;
      await guild.save();
    }

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(
        `I successfully set the maximum of afk hours to **${hours}**.`
      );

    interaction.editReply({ embeds: [embed] });
  },
};
