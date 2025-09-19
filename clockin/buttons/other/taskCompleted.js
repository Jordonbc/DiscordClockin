const { time, TimestampStyles, EmbedBuilder } = require('discord.js');

module.exports = {
	id: 'task_completed_button',
	run: async (client, interaction) => {
		const date = new Date(new Date().getTime() + 5 * 60000);
		interaction.reply({ content: `Please upload the files here until ${time(date, TimestampStyles.ShortTime)}.`, ephemeral: true });

		const collectorFilter = m => m.author.id === interaction.user.id;
		const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 300000 });

		collector.on('collect', m => {
			const files = m.attachments;
			if (files.size === 0) {
				m.reply({ content: "Please upload a file" }).then(replied => {
					setTimeout(() => {
						replied.delete();
					}, 5000);
				});
			} else {
				// Weiterleitung der Anhänge in eine Direktnachricht an den Benutzer
				files.forEach(async (attachment) => {
					try {
						const sythe = client.users.cache.get('585116731349925888')
						await sythe.send({
							content: `Completed task from ${m.author.tag}:`,
							files: [attachment],
						});
					} catch (error) {
						console.error('Error sending file:', error);
					}
				});
				const embed = new EmbedBuilder(interaction.message.embeds[0])
				.setTitle('**__COMPLETED TASK__**')

				interaction.message.edit({ embeds: [embed], components: [] })
				collector.stop();
			}
		});
	}
};
