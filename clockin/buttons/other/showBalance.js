const { EmbedBuilder, PermissionsBitField, ApplicationCommandType } = require('discord.js');
const Workers = require('../../models/worker.js');
const Roles = require("../../models/roles.js");


module.exports = {
	id: 'showBalance_button',
	//permissions: [],
	run: async (client, interaction) => {
		await interaction.deferReply({ ephemeral: true })
        if(!interaction?.guild) return interaction.editReply({ content: "Please run this command on a server!" });
		  
        let userobj = interaction.user;
        
        if(userobj.id != interaction.user.id) {
        	if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.editReply({ content: "You are not permitted to use this command on other users! To check other users, you need `Administrator` Permissions", ephemeral: true });
        	
        }
        
        const workers = await Workers.findOne({ guildId: interaction.guild.id });
        const user = workers.workers.find(worker => worker.userId === userobj.id);
        
        
        const notFound = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription("This user isn't a worker here.")
        
        if(!user) return interaction.editReply({ embeds: [notFound] });
        
        const roles = await Roles.findOne({ guildId: interaction.guild.id });
        const role = roles.roles.find(role => role.id === user.roleId);
        
        let salary = 0
        let fullSalary = 0

        const hourlyRate = role.hourlySalary[user.experience] || role.hourlySalary.Mid;

        dailySalary = Math.floor((user.dailyWorked * hourlyRate) * 100) / 100;
        salary = Math.floor((user.weeklyWorked * hourlyRate) * 100) / 100;
        fullSalary = Math.floor((user.totalWorked * hourlyRate) * 100) / 100;
        
        const found = new EmbedBuilder()
        .setTitle(`Your balance`)
        .setColor("Green")
        .addFields(
            { name: "Today balance:", value: "```£" + dailySalary + "p```", inline: true },
            { name: "Weekly balance:", value: "```£" + salary + "p```", inline: true },
            { name: "Full balance:", value: "```£" + fullSalary + "p```", inline: true }
        );
        
        interaction.editReply({ embeds: [found] });
	}
};
