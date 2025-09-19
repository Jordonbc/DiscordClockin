const Workers = require("../models/worker.js");
const Roles = require("../models/roles.js");
const guildSettings = require("../models/guildSettings.js");
const messageIds = require("../models/messageIds.js");

async function deleteWorkers(interaction) {
    const workersGuild = await Workers.findOneAndDelete({ guildId: interaction.guild.id });
    if(!workersGuild) return interaction.editReply({ content: ":x: No data found!" });
    return interaction.editReply({ content: `:white_check_mark: **Successfully** deleted all \`${workersGuild.workers.length}\` workers!`})
}

async function deleteRoles(interaction) {
    const rolesGuild = await Roles.findOneAndDelete({ guildId: interaction.guild.id });
    if(!rolesGuild) return interaction.editReply({ content: ":x: No data found!" });
    return interaction.editReply({ content: `:white_check_mark: **Successfully** deleted all \`${rolesGuild.roles.length}\` roles and \`${rolesGuild.categorys.length}\` categorys!`})
}

async function deleteAll(interaction) {
    const rolesGuild = await Roles.findOneAndDelete({ guildId: interaction.guild.id });
    const workersGuild = await Workers.findOneAndDelete({ guildId: interaction.guild.id });
    //const settingsGuild = await guildSettings.findOneAndDelete({ guildId: interaction.guild.id });
    const messageGuild = await messageIds.findOneAndDelete({ guildId: interaction.guild.id });
    let string = "";

    if(rolesGuild) string += ":white_check_mark: Roles deleted!";
    else string += ":x: No roles found!";

    if(workersGuild) string += "\n:white_check_mark: Workers deleted!";
    else string += "\n:x: No workers found!";

    /*
    if(settingsGuild) string += "\n:white_check_mark: Guild settings deleted!";
    else string += "\n:x: No guild settings found!";
    */

    if(messageGuild) string += "\n:white_check_mark: Message ids deleted!";
    else string += "\n:x: No message ids found!";

    interaction.editReply({ content: string })
}

module.exports = { deleteWorkers, deleteRoles, deleteAll };