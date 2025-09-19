const GuildSettings = require("../models/guildSettings");
const { setupStatusMessage } = require("../functions/syncData");

// this select menu is created when the voice exempt role button is clicked
module.exports = {
  id: "setup_voiceExemptRole_selectMenu",
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    // get the guild settings
    const settings = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });

    // set the voice exempt role to the selected role(s)
    settings.voiceExemptRole = interaction.values;
    await settings.save();

    const [embed, buttons] = await setupStatusMessage(
      settings,
      interaction.guild
    );

    interaction.editReply({ embeds: [embed], components: buttons });
  },
};
