const { EmbedBuilder, ApplicationCommandType } = require('discord.js');
const mongoose = require('mongoose');
const Guildsettings = require('../../models/guildSettings.js');

module.exports = {
	name: 'setplan',
	description: "» Set a subscription for a guild",
	cooldown: 3000,
	type: ApplicationCommandType.ChatInput,
    default_member_permissions: 'Administrator',
	options: [
                {
                    name: 'guildid',
                    description: 'What is the guild id',
                    type: 3,
                    required: true
                },
                {
                	name: 'plan',
                	description: 'Which plan should it be?',
                	type: 3,
                	choices: [
						{ name: "None", value: "plan_none"},
                		{ name: "Basic", value: "plan_basic" },
                		{ name: "Pro", value: "plan_pro" },
                		{ name: "Elite", value: "plan_elite" }
                	],
                	required: true
                },
    ],
	run: async (client, interaction) => {
		const planValue = interaction.options.get('plan').value;
		const guildId = interaction.options.getString("guildid");

		const guild = client.guilds.cache.get(guildId);
		if(!guild) return interaction.reply({ content: ":x: I dont found any guild with that id.", ephemeral: true })

		await interaction.deferReply();
		const embed = new EmbedBuilder()
		.setColor("Green")
		.setFooter({
			text: guild.name,
			iconURL: guild.iconURL()
		})
		const guildProfile = await Guildsettings.findOne({ guildId: guildId })
		let plan = "";
		if(planValue === "plan_none") {
			if(guildProfile) {
				guildProfile.plan = undefined;
				await guildProfile.save();
			} else {
				const newGuildProfile = new Guildsettings({
					guildId: guildId
				})
				await newGuildProfile.save()
			}
			embed
			.setDescription(`I successfully **removed** the subscription from **${guild.name}**`)

			return interaction.editReply({ embeds: [embed] })
		} else if(planValue === "plan_basic") {
			plan = "Basic"
		} else if(planValue === "plan_pro") {
			plan = "Pro"
		} else if(planValue === "plan_elite") {
			plan = "Elite"
		} else {
			return;
		}
		
		
		if(guildProfile) {
			guildProfile.plan = plan;
			await guildProfile.save();
		} else {
			const newGuildProfile = new Guildsettings({
				guildId: guildId,
				plan: plan
			})
			await newGuildProfile.save();
		}

		embed
		.setDescription(`I successfully set the **${plan}** subscription to **${guild.name}**`)

		interaction.editReply({ embeds: [embed] })
    }
};
