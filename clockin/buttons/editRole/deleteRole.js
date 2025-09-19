const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Workers = require('../../models/worker.js');

module.exports = {
	id: 'delete_role_button',
	//permissions: [],
	run: async (client, interaction) => {
		let workers = await Workers.findOne({ guildId: interaction.guild.id });
		workers = workers.workers.filter(worker => worker.roleId === interaction.message.embeds[0].fields[3].value.slice(3, -3));
		if(workers.length === 0) {
			const modal = new ModalBuilder()
			.setCustomId('deleteRole_safety_modal')
			.setTitle('🗑 | Delete Role');

		
			const pageInput = new TextInputBuilder()
				.setCustomId('yes_input')
				.setLabel("Are you sure you want to delete the role?")
				.setPlaceholder("Yes")
        		.setMaxLength(3)
        		.setRequired(true)
				.setStyle(TextInputStyle.Short);

			
			const firstActionRow = new ActionRowBuilder().addComponents(pageInput);
			
			
			modal.addComponents(firstActionRow);

			await interaction.showModal(modal);
		} else {
			let users = ""
			for(worker of workers) {
				const user = await client.users.cache.get(worker.userId);
				users += `- ${user ? user : worker.userId}\n`
			}

			const embed = new EmbedBuilder()
			.setColor("Red")
			.setTitle("Role conflicts")
			.setDescription("Please change the role for following users with the `/change-role` command, then try again.\n\n" + users)

			interaction.reply({ embeds: [embed], ephemeral: true })
		}
        
        
	}
};
