const { StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const Roles = require("../../models/roles.js");

module.exports = {
	id: 'editRole_category_button',
	//permissions: [],
	run: async (client, interaction) => {
		const roleId = interaction.message.embeds[0].fields[3].value.slice(3, -3);
		const roles = await Roles.findOne({ guildId: interaction.guild.id })
		const roleIndex = roles.roles.findIndex(role => role.id === roleId);

		const options = []
		options.push(
			new StringSelectMenuOptionBuilder()
			.setLabel("Create a new one")
			.setEmoji("➕")
			.setValue("new_category")
		)
		roles.categorys.forEach(role => {
			options.push(
				new StringSelectMenuOptionBuilder()
				.setLabel(role)
				.setValue(role)
			)
		})
		const select = new StringSelectMenuBuilder()
			.setCustomId('editRole_category_selectMenu')
			.setPlaceholder('Choose a category!')
			.addOptions(options);
		

		const row = new ActionRowBuilder()
			.addComponents(select);

		interaction.update({ components: [row] })
	}
};
