const { EmbedBuilder, ActionRowBuilder, ChannelType, ChannelSelectMenuBuilder } = require('discord.js');
const GuildSettings = require('../../models/guildSettings');

module.exports = {
	id: 'setup_log_button',
	//permissions: [],
	run: async (client, interaction) => {
		await interaction.deferUpdate()

		const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id })

		const embed = new EmbedBuilder()
		.setColor('#81e6ff')
		.setDescription('Choose your channel')

		const row = new ActionRowBuilder()
		.addComponents(
			new ChannelSelectMenuBuilder()
			.setCustomId('setup_log_selectMenu')
			.setPlaceholder('📣 › Select a channel for the log')
			.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
			.setDefaultChannels(guildSettings.logChannelId ? [guildSettings.logChannelId] : [])
			.setMinValues(0)
		);

		interaction.editReply({ embeds: [embed], components: [row] })
	}
};
