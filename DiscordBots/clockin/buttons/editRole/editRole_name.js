const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
	id: 'editRole_name_button',
	//permissions: [],
	run: async (client, interaction) => {
        const modal = new ModalBuilder()
			.setCustomId('editRole_name_modal')
			.setTitle('🛠 | Change role name');

		
		const pageInput = new TextInputBuilder()
			.setCustomId('input')
			.setLabel("What should be the new name?")
        	.setMaxLength(25)
        	.setRequired(true)
			.setStyle(TextInputStyle.Short);

		
		const firstActionRow = new ActionRowBuilder().addComponents(pageInput);
		
        
		modal.addComponents(firstActionRow);

		await interaction.showModal(modal);
        
	}
};
