const { EmbedBuilder } = require('discord.js');
const Roles = require("../models/roles.js");

module.exports = {
	id: 'editRole_name_modal',
	//permissions: [],
	run: async (client, interaction) => {
	const input = interaction.fields.getTextInputValue('input');
	const roleId = interaction.message.embeds[0].fields[3].value.slice(3, -3);
	const roles = await Roles.findOne({ guildId: interaction.guild.id })

	const roleIndex = roles.roles.findIndex(role => role.id === roleId);

	const embed = new EmbedBuilder()
	.setColor("Green")
	.setDescription(":white_check_mark: I successfully changed the role name from `" + roles.roles[roleIndex].name + "` to `" + input + "`!")

	roles.roles[roleIndex].name = input;

	await roles.save();


	interaction.update({ embeds: [embed], components: [] })
        
	}
};
