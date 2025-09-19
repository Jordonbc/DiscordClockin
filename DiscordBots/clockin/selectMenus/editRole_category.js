const { EmbedBuilder } = require ("discord.js");
const Roles = require('../models/roles.js');

module.exports = {
	id: 'editRole_category_selectMenu',
	default_member_permissions: 'Administrator',
	run: async (client, interaction) => {
        const roleId = interaction.message.embeds[0].fields[3].value.slice(3, -3);
		const roles = await Roles.findOne({ guildId: interaction.guild.id })
		const roleIndex = roles.roles.findIndex(role => role.id === roleId);
		const oldCategory = roles.roles[roleIndex].category;

		if(interaction.values[0] === "new_category") {

		} else {
			const embed = new EmbedBuilder()
			.setColor("Green")
			.setDescription(`:white_check_mark: You successfully set the category from \`${roles.roles[roleIndex].category}\` to \`${interaction.values[0]}\`!`)
			
			roles.roles[roleIndex].category = interaction.values[0]
			const isCategoryUsed = roles.roles.some(role => role.category === oldCategory);
			
			
        	if (!isCategoryUsed) {
				const categoryIndex = roles.categorys.findIndex(cat => cat === oldCategory);
            	roles.categorys.splice(categoryIndex, 1);
        	}
			await roles.save()

			interaction.update({ embeds: [embed], components: [], content: "" })
		}
        
        
		
	}
};
