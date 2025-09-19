const fs = require('fs');
const chalk = require('chalk')
var AsciiTable = require('ascii-table')
var table = new AsciiTable()
table.setHeading('Buttons', 'Stats').setBorder('|', '=', "0", "0")

module.exports = (client) => {
  fs.readdirSync('./buttons/').forEach(async dir => {
    fs.readdirSync(`./buttons/${dir}/`).filter((file) => file.endsWith('.js')).forEach((file) => {
        const button = require(`../buttons/${dir}/${file}`)
        client.buttons.set(button.id, button)
    table.addRow(button.id, '✅')
    })
  })
	console.log(chalk.cyanBright(table.toString()))
};
