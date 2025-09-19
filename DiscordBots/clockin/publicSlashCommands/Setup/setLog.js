const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const guildSchema = require("../../models/guildSettings.js");
const { planRequired } = require("../../functions/embeds.js");

module.exports = {
  name: "setup-log",
  description: "» Setup the log channel",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  plan: "Basic",
  default_member_permissions: "Administrator",
  category: "Setup",
  options: [
    {
      name: "channel",
      description: "In which channel should the clock outs be logged?",
      type: 7,
      required: true,
    },
  ],
  run: async (client, interaction) => {
    try {
      const channel = interaction.options.get("channel").channel;
      if (channel.type !== 5 && channel.type !== 0)
        return interaction.reply({
          content: "Please take a text channel or news channel.",
          ephemeral: true,
        });
      await interaction.deferReply();
      const guildSettings = await guildSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!guildSettings?.plan)
        return interaction.editReply({ embeds: [planRequired("Basic")] });
      guildSettings.logChannelId = channel.id;
      await guildSettings.save();

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(
          ":white_check_mark: You successfully setup the log channel!"
        );

      interaction.editReply({ embeds: [embed] });
    } catch (e) {
      interaction.channel.send({
        content: "**ERROR:**\n```" + e.message + "```",
      });
    }
  },
};
