const GuildSettings = require('../models/guildSettings');
const { setupStatusMessage } = require('../functions/syncData');

module.exports = {
	id: 'setup_log_selectMenu',
	run: async (client, interaction) => {
		await interaction.deferUpdate()
		const settings = await GuildSettings.findOne({ guildId: interaction.guild.id })

		settings.logChannelId = interaction.values[0]
		await settings.save()

		const [embed, buttons] = await setupStatusMessage(settings, interaction.guild)

		interaction.editReply({ embeds: [embed], components: buttons })
	}
};
