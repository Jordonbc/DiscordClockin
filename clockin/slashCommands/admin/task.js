const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ApplicationCommandType } = require('discord.js');
const Worker = require('../../models/workers.js');
const Role = require('../../models/workerRoles.js');
const Messages = require('../../models/messageIds.js');

module.exports = {
	name: 'task',
	description: "» ...",
	cooldown: 3000,
	type: ApplicationCommandType.ChatInput,
    default_member_permissions: 'Administrator',
	options: [
                {
                    name: 'user',
                    description: "Which user you wan't to give a task?",
                    type: 6,
                    required: true
                },
                {
                    name: 'task',
                    description: 'Please type in the task',
                    type: 3,
                    required: true
                },
                {
                    name: 'duedate',
                    description: 'Please type in the due date',
                    type: 3,
                    required: true
                }
    ],
	run: async (client, interaction) => {
        const user = interaction.options.get('user').user;
        const task = interaction.options.get('task').value;
        const duedate = interaction.options.get('duedate').value;

        const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('**__A NEW TASK__**')
        .setDescription(`>>> *${task}*`)
        .setFooter({ text: duedate })

        const row = new ActionRowBuilder()
			.addComponents(
                new ButtonBuilder()
                .setCustomId('task_completed_button')
                .setLabel('Completed')
                .setStyle('Success')
            );

        user.send({ embeds: [embed], components: [row] })
    }
};
