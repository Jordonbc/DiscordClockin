const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const guildSchema = require("../../models/guildSettings.js");

module.exports = {
  name: "afktime",
  description: "» Enables admins to adjust the time limit for AFK checks.",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  plan: "Basic",
  guildOnly: true,
  category: "Setup",
  options: [
    {
      name: "hours",
      description: "The amount of hours",
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
        afkReminders: hours,
      });
      await newGuild.save();
    } else {
      guild.afkReminders = hours;
      await guild.save();
    }

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(
        `I successfully set the afk reminder to every **${hours}** hours.`
      );

    interaction.editReply({ embeds: [embed] });
  },
};
