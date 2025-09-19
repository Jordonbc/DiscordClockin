const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Role = require("../models/roles.js");

module.exports = {
	id: 'rolelist_page_modal',
	//permissions: [],
	run: async (client, interaction) => {
	
	const pageString = interaction.fields.getTextInputValue('page_input');
	
	if(isNaN(pageString)) {
		return interaction.reply({ content: ":x: You need to put in a number.", ephemeral: true })
	}

	const number = parseInt(pageString);

	const category = interaction.message.embeds[0].fields[2].value.slice(3, -3);
	const roles = await Role.findOne({ guildId: interaction.guild.id });
    
	const role = roles.roles.filter(role => role.category === category)[number-1]
	const nextRole = roles.roles.filter(role => role.category === category)[number]
	if(!role) {
		return interaction.reply({ content: `:x: I dont found any role at the position **${number}**`, ephemeral: true })
	}
	let hourlySalaryString = "";
	for (const [level, salary] of role.hourlySalary) {
		if (level !== undefined && salary !== undefined) {
			hourlySalaryString += `${level}: £${salary}p\n`;
		}
	}
	const embed = new EmbedBuilder()
    .setColor("Green")
    .addFields(
    	{ name: "<:icon_manage:1143982720356204684> Role name", value: "```" + role.name + "```", inline: true },
    	{ name: "<:icon_pound:1143982650525241426> Hourly salary", value: "```" + hourlySalaryString + "```", inline: true },
    	{ name: "Category", value: "```" + role.category + "```", inline: true },
    	{ name: "<:icon_id:1145681522855260262> Role ID", value: "```" + role.id + "```", inline: true },
    )
	.setFooter({ text: `${number}` });
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('back_rolelist')
				.setLabel('Back')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(number === 1 ? true : false),
			new ButtonBuilder()
				.setCustomId('page_rolelist')
				.setLabel(`${number}`)
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId('next_rolelist')
				.setLabel('Next')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(nextRole ? false : true),
		)

	interaction.update({ embeds: [embed], components: [interaction.message.components[0], interaction.message.components[1], row] })
        
	}
};
