const GuildSettings = require("../models/guildSettings");
const { setupStatusMessage } = require("../functions/syncData");

//this select menu is created when the bot manager role button is clicked
module.exports = {
  id: "setup_adminRole_selectMenu",
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    //get the guild settings
    const settings = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });

    settings.botAdminRole = interaction.values;
    await settings.save();

    const [embed, buttons] = await setupStatusMessage(
      settings,
      interaction.guild
    );

    interaction.editReply({ embeds: [embed], components: buttons });
  },
};
