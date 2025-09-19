const { EmbedBuilder } = require('discord.js');
const config = require("../config.json");

module.exports = {
	id: 'fix_green_modal',
	//permissions: [],
	run: async (client, interaction) => {
	
	const workersDescription = interaction.fields.getTextInputValue('fix_input');

        if(workersDescription) {
	if (!config.updatesGuildId || !config.updatesChannelId) {
		throw new Error("Missing updates guild/channel configuration values");
	}
	const embed = new EmbedBuilder()
	.setColor("Green")
	.setTitle("A new update")
	.setDescription(workersDescription)
	.setTimestamp()
	
	const guild = client.guilds.cache.get(config.updatesGuildId);
	
	if (!guild) {
		throw new Error("Updates guild not found in cache");
	}

	const channel = guild.channels.cache.get(config.updatesChannelId);

	if (!channel) {
		throw new Error("Updates channel not found in cache");
	}
	
	channel.send({ embeds: [embed] })
	interaction.reply({ content: "☑️", ephemeral: true });
        }
        
	}
};
