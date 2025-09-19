const { AttachmentBuilder } = require("discord.js");
const ExcelJS = require("exceljs");

module.exports = {
	name: 'excel',
	description: "test command",
	cooldown: 3000,
	userPerms: [],
	botPerms: [],
	run: async (client, message, args) => {
		const workbook = new ExcelJS.Workbook()
		const worksheet = workbook.addWorksheet("Sheet 1");

		worksheet.addRow(["Name", "Age"]);
		worksheet.addRow(["John Doe", 25]);

		const filename = "weeklyReport.xlsx"
		await workbook.xlsx.writeFile(filename);

		const attachment = new AttachmentBuilder(filename);

		message.reply({ files: [attachment] });

		setTimeout(() => {
			require("fs").unlinkSync(filename);
		}, 5000);
	}
};