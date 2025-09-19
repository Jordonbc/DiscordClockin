const { EmbedBuilder, ApplicationCommandType } = require('discord.js');
const os = require("os")
const process = require('process')

module.exports = {
	name: 'systemdata',
	description: "Get some infos about the server",
	cooldown: 3000,
	type: ApplicationCommandType.ChatInput,
    default_member_permissions: 'Administrator',
	options: [],
	run: async (client, interaction) => {
		await interaction.deferReply({ ephemeral: true })
		console.log(process.cpuUsage())
		
        const embed = new EmbedBuilder()
		.setColor("DarkPurple")
		.setTitle("Bot Info and system statitistics! Nyah-")
		.addFields(
			{
				name: "CPU",
				value: os.cpus()[0].model,
				inline: true
			},
			{
				name: "CPU usage",
				value: `{}%`,
				inline: true
			}
		)

		interaction.editReply({ embeds: [embed] })
    }
};
