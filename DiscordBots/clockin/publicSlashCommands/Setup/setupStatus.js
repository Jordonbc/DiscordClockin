const { ApplicationCommandType } = require("discord.js");
const guildSchema = require("../../models/guildSettings.js");
const { setupStatusMessage } = require("../../functions/syncData");

module.exports = {
  name: "setup-status",
  description: "» Check whether you have already set everything possible",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  category: "Setup",
  default_member_permissions: "Administrator",
  options: [],
  run: async (client, interaction) => {
    await interaction.deferReply();

    // fetch the guild settings
    const settings = await guildSchema.findOne({
      guildId: interaction.guild.id,
    });

    const [embed, buttons] = await setupStatusMessage(
      settings,
      interaction.guild
    );

    interaction.editReply({ embeds: [embed], components: buttons });
  },
};
