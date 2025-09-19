const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Worker = require('../models/workers.js');
const Role = require('../models/workerRoles.js');
const Messages = require('../models/messageIds.js');
const config = require("../config.json");

module.exports = {
	id: 'clockout_modal',
	//permissions: [],
	run: async (client, interaction) => {
	
	await interaction.deferUpdate({  });
	
	const worker = await Worker.findOne({ userId: interaction.user.id });
	const workersDescription = interaction.fields.getTextInputValue('clockout_input');
        
        if(!worker) {
        	
        }
        else if(worker) {
        const workerRole = await Role.findOne({ id: worker.roleId });
       
        hours_worked = Math.floor(worker.worked);
        minutes_worked = Math.floor((worker.worked - hours_worked) / 0.01666667);
        
        hours_break = Math.floor(worker.breakTime);
        minutes_break = Math.floor((worker.breakTime - hours_break) / 0.01666667);
        
        worker.weeklyWorked = worker.weeklyWorked + worker.worked
        
        worker.dailyWorked += worker.worked
        worker.totalWorked += worker.worked
        
        hours_weekly = Math.floor(worker.weeklyWorked);
        minutes_weekly = Math.floor((worker.weeklyWorked - hours_weekly) / 0.01666667);
        
        let salary = 0
        
        if(worker.experience == "Junior") {
        	salary = Math.floor((worker.worked * workerRole.hourlySalary.Junior) * 100) / 100
        } else if (worker.experience == "Mid") {
        	salary = Math.floor((worker.worked * workerRole.hourlySalary.Mid) * 100) / 100
        } else if (worker.experience == "Senior") {
        	salary = Math.floor((worker.worked * workerRole.hourlySalary.Senior) * 100) / 100
        } else {
        	salary = Math.floor((worker.worked * workerRole.hourlySalary.Mid) * 100) / 100
        }
        
       function dateFormat(timestamp) {
       		const now = new Date(timestamp);
		let day = now.getDate().toString().padStart(2, '0');
		let month = (now.getMonth() + 1).toString().padStart(2, '0');
		let year = now.getFullYear();
		//let hour = (now.getHours() + 1).toString().padStart(2, '0');
		let hour = (now.getHours()).toString().padStart(2, '0');
		const minute = now.getMinutes().toString().padStart(2, '0');
		const second = now.getSeconds().toString().padStart(2, '0');
		
		if(hour === "24") {
			hour = "0";
			day++
			if(month === "1" || month === "3" || month === "5" || month === "7" || month === "8" || month === "10" || month === "12") {
				if(day === "32") {
					day = "1"
					month++
					if(month === "13"){
						month = "1"
						year++
					}
				}
			}
			else {
				if(month === "2") {
					if((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
						if (day === "30") {
                					day = "1";
                					month++;
                					if(month === "13"){
								month = "1"
								year++
							}
            					}
					}
					else {
            					if (day === "29") {
                					day = "1";
                					month++;
                					if(month === "13"){
								month = "1"
								year++
							}
            					}
            				}
				}
				else {
					if(day === "31") {
						day = "1"
						month++
						if(month === "13"){
							month = "1"
							year++
						}
					}
				}
			}
		}
	
		return date = `${day}/${month}/${year}, ${hour}:${minute}:${second}`;
	}
        
        if (!config.clockoutFooterText || !config.clockoutFooterIconUrl) {
        	throw new Error("Missing clockout footer configuration values");
        }

        const embed = new EmbedBuilder()
        .setTitle("You have clocked out!")
        .addFields(
        	{
        		name: "Clocked in",
        		value: `${dateFormat(interaction.message.createdTimestamp)}`,
        		inline: true
        	},
        	{
        		name: "Clocked out",
        		value: `${dateFormat(Date.now())}`,
        		inline: true
        	},
        	{
        		 name: "Worked time",
        		 value: `${hours_worked} hours ${minutes_worked} minutes`,
        		 inline: true
        	},
        	{
        		 name: "Break time",
        		 value: `${hours_break} hours ${minutes_break} minutes`,
        		 inline: true
        	},
        	{
        		 name: "Breaks count",
        		 value: `${worker.breaksCount}`,
        		 inline: true
        	},
        	{
        		 name: "Total hours worked (this week)",
        		 value: `${hours_weekly} hours ${minutes_weekly} minutes`,
        		 inline: true
        	},
        	{
        		 name: "Revenue",
        		 value: `£${salary}p`,
        		 inline: true
        	},
        	{
        		 name: "Worker's description",
        		 value: workersDescription,
        		 inline: true
        	},
        )
        .setColor("Green")
        .setFooter({ text: config.clockoutFooterText, iconURL: config.clockoutFooterIconUrl });
        
        const clockOutEmbed = new EmbedBuilder()
        .setDescription("```" + interaction.user.id + "```")
        .addFields(
        	{
        		 name: "Session Revenue",
        		 value: `£${salary}`,
        		 inline: false
        	},
        	{
        		name: "User Clocked in",
        		value: `${dateFormat(interaction.message.createdTimestamp)}`,
        		inline: true
        	},
        	{
        		name: "Clocked out",
        		value: `${dateFormat(Date.now())}`,
        		inline: true
        	},
        	{
        		 name: "Worked time",
        		 value: `${hours_worked} hours ${minutes_worked} minutes`,
        		 inline: true
        	},
        	{
        		 name: "Break time",
        		 value: `${hours_break} hours ${minutes_break} minutes`,
        		 inline: true
        	},
        	{
        		 name: "Breaks count",
        		 value: `${worker.breaksCount}`,
        		 inline: true
        	},
        	{
        		 name: "Total hours (this week)",
        		 value: `${hours_weekly} hours ${minutes_weekly} minutes`,
        		 inline: true
        	},
        	{
        		 name: "Worker's description",
        		 value: workersDescription,
        		 inline: false
        	},
        )
        .setColor("Green")
        .setTimestamp();
        
        worker.status = "Offline"
        worker.breaksCount = 0
        worker.worked = 0
        worker.breakTime = 0
		worker.clockDates.clockOut.push(Date.now());
        await worker.save()
        
        ////////////// Actuall Workers \\\\\\\\\\\\\
    	
    	
    	const messageDB = await Messages.findOne({ name: "clockIn" });
    	
    	const guild = client.guilds.cache.get(messageDB.guildId);
    	
    	
    	if(!guild) return console.log("ERROR: ClockIn message guild not found");
    	
    	const channel = guild.channels.cache.get(messageDB.channelId);
    	
    	if(!channel) return console.log("ERROR: ClockIn message not found");
    	
    	
    	channel.messages.fetch(messageDB.id).then(msg => {
    	const embed = new EmbedBuilder(msg.embeds[0]);
    	let valueList = "";
    	//const workers = Worker.find({status: { $in: ['Work', 'Break'] } })
    	Worker.find({ status: { $in: ['Work', 'Break'] } }).exec().then((workers) => {
  if(workers.length === 0) {
      embed.setFields({ name: msg.embeds[0].fields[0].name, value:  "`None`", inline: true }, msg.embeds[0].fields[1]);
    		msg.edit({ embeds: [embed] })
    } else {
    	workers.map(async member => {
    	let emoji = "";
    	const user =  await client.users.cache.get(member.userId);
		if(!user) {
			member.status = "Offline";
			await member.save()
		} else {
    	
    		if(member.status === "Work") {
    			emoji = "<a:Online:1104732785190645841>";
    		}
    		else {
    			emoji = "<a:offline:1104732808963948605>";
    		}
		
    			valueList = `${valueList}${emoji} ${user.username}\n`
    			embed.setFields({ name: msg.embeds[0].fields[0].name, value:  valueList, inline: true }, msg.embeds[0].fields[1]);
    			msg.edit({ embeds: [embed] })
		}
    		
    	});
    	
    	
    	
    }
  
  })


    	
    	
    	////////////// Actuall Workers \\\\\\\\\\\\\
        
        });
    
    
        interaction.editReply({ embeds: [embed], components: [], files: [] })
        
        if (!config.clockoutLogGuildId || !config.clockoutLogChannelId) {
	throw new Error("Missing clockout log configuration values");
        }

        const guild2 = client.guilds.cache.get(config.clockoutLogGuildId)

        if (!guild2) {
	throw new Error("Clockout log guild not found in cache");
        }

        const log = guild2.channels.cache.get(config.clockoutLogChannelId)

        if (!log) {
	throw new Error("Clockout log channel not found in cache");
        }

        embed.setTitle(`${interaction.user.tag} has clocked out!`);
        
        log.send({ content: `${interaction.user}`, embeds: [clockOutEmbed] })
        
        
    	
    	
    	
    	
        }
        
	}
};
