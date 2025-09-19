const { EmbedBuilder, time, StringSelectMenuBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder } = require ("discord.js");
const Holidays = require('../models/holidaysTimers.js');
const { updateClockInMessage } = require('../functions/syncData.js');

module.exports = {
	id: 'profile_manage_timeoffs_selectMenu',
	run: async (client, interaction) => {
		const embed = new EmbedBuilder()
		.setFooter(interaction.message.embeds[0].footer)
		.setAuthor({ name: interaction.values[0] })
	}
};
