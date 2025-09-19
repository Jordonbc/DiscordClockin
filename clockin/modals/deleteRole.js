const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const Roles = require("../models/roles.js");

module.exports = {
	id: 'deleteRole_safety_modal',
	//permissions: [],
	run: async (client, interaction) => {
	await interaction.deferReply({ ephemeral: true })
	const input = interaction.fields.getTextInputValue('yes_input');
	if(input.toLowerCase() === "yes") {
		const roleId = interaction.message.embeds[0].fields[3].value.slice(3, -3);
		const roles = await Roles.findOne({ guildId: interaction.guild.id })

		const roleIndex = roles.roles.findIndex(role => role.id === roleId);
		const category = roles.roles[roleIndex].category;
		roles.roles.splice(roleIndex, 1);

		const isCategoryUsed = roles.roles.some(role => role.category === category);
        if (!isCategoryUsed) {
			const categoryIndex = roles.categorys.findIndex(cat => cat === category);
            roles.categorys.splice(categoryIndex, 1);
        }

		if(!roles?.categorys[0]) {
			const errorEmbed = new EmbedBuilder()
			.setColor("Red")
			.setDescription("You actually dont have any roles!")

			return interaction.message.edit({ embeds: [errorEmbed] })
		}

		const options = []
		roles.categorys.forEach(role => {
			options.push(
				new StringSelectMenuOptionBuilder()
				.setLabel(role)
				.setValue(role)
			)
		})
		const select = new StringSelectMenuBuilder()
			.setCustomId('roleList_categorys_selectMenu')
			.setPlaceholder('Choose a category!')
			.addOptions(options);
		

		const row = new ActionRowBuilder()
			.addComponents(select);

		const embed = new EmbedBuilder()
		.setDescription("Choose a category for the role from the select menu below.")
		.setColor("Aqua")

		await roles.save();

		interaction.message.edit({ embeds: [embed], components: [row]})

		interaction.editReply({ content: ":white_check_mark: Deleted successfully!" })
	} else {
		interaction.editReply({ content: ":white_check_mark: Canceled successfully!" })
	}
        
	}
};
