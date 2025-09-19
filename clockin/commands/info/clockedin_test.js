const Canvas = require('@napi-rs/canvas');
const { request } = require('undici');
const { AttachmentBuilder } = require("discord.js");

module.exports = {
	name: 'clockin',
	description: "Check bot's ping.",
	cooldown: 3000,
	userPerms: [],
	botPerms: [],
	run: async (client, message, args) => {
		const canvas = Canvas.createCanvas(4096, 1548);
		const context = canvas.getContext('2d');
        
        const background = await Canvas.loadImage("./clocked_in.png");

	context.drawImage(background, 0, 0, canvas.width, canvas.height);
	
	context.strokeRect(0, 0, canvas.width, canvas.height);
	
	const { body } = await request(message.author.displayAvatarURL({ extension: "jpg" }));
	const avatar = await Canvas.loadImage(await body.arrayBuffer());
	
	context.beginPath();

	context.arc(125, 125, 100, 0, Math.PI * 2, true);

	context.closePath();

	context.clip();
	
	
	context.drawImage(avatar, 25, 25, 100, 100);

    //const image = await canvas.encode('png')
	const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'banner-image.png' });
	message.reply({ files: [attachment] });
	

	}
};