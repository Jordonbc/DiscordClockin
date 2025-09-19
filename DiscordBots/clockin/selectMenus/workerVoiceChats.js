const GuildSettings = require("../models/guildSettings");
const { setupStatusMessage } = require("../functions/syncData");

// this select menu is created when the worker voice chats button is clicked
module.exports = {
  id: "workerVoiceChats_selectMenu",
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    //get the guild settings
    const settings = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });

    settings.workerVoiceChats = interaction.values;
    await settings.save();

    const [embed, buttons] = await setupStatusMessage(
      settings,
      interaction.guild
    );

    interaction.editReply({ embeds: [embed], components: buttons });
  },
};
