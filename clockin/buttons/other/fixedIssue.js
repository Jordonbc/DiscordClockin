const { EmbedBuilder } = require('discord.js');

module.exports = {
	id: 'fixed_issue_button',
	//permissions: [],
	run: async (client, interaction) => {
		const embed = new EmbedBuilder()
		.setDescription(interaction.message.embeds[0].description)
		.setColor('Green')
		.setTimestamp()

		try {
			const author = client.users.cache.get(interaction.message.embeds[0].footer.text);
			author.send({ content: "Hey, your issue has just been fixed!", embeds: [embed] })
		} catch(e) {
			return interaction.reply({ content: "I couldn't send a DM", ephemeral: true })
		}

		interaction.channel.delete()
		interaction.reply({ content: 'Everything was successful!', ephemeral: true })
	}
};
