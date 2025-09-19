const { EmbedBuilder } = require("discord.js");
const getLocalCommands = require("../utils/getLocalCommands");
const premiumEmojis = {
  None: "<:diamond1:1251970140745236592>",
  Basic: "<:diamond2:1251970138756878377>",
  Pro: "<:diamond3:1251970135821123724>",
  Elite: "<:diamond4:1251970133820182729>",
};

module.exports = {
  id: "help_menu",
  run: async (client, interaction) => {
    //await interaction.deferUpdate({ ephemeral: true })
    const categorys = new Array();

    const publicLocalCommands = await getLocalCommands(
      [],
      "publicSlashCommands"
    );

    for (let command of publicLocalCommands) {
      let category = categorys.find((c) => c.category === command.category);
      if (category) {
        category.commands.push(command);
      } else if (!category) {
        let name = command.category;
        categorys.push({
          category: name,
          commands: [command],
        });
      }
    }

    var parts = interaction.values[0].split("_");
    var mittelteil = parts[1];

    let category = categorys.find((c) => c.category === mittelteil);

    function getEmbed(category) {
      let commands = "";
      for (let cmd of category.commands) {
        commands =
          commands +
          `${premiumEmojis[cmd.plan]} </${cmd.name}:${cmd.id}>\n> ${
            cmd.description
          }\n\n`;
      }
      let hEmbed = new EmbedBuilder()
        .setTitle(
          `❔ » **COMMANDS** » **__${category.category.toUpperCase()}__**`
        )
        .setDescription(
          commands +
            "\n<:diamond1:1251970140745236592> - No Subscription\n<:diamond2:1251970138756878377> - Basic Subscription\n<:diamond3:1251970135821123724> - Pro Subscription\n<:diamond4:1251970133820182729> - Elite Subscription"
        )
        .setColor("#81e6ff");

      return hEmbed;
    }

    if (!category) return;
    else if (category) {
      let hEmbed = getEmbed(category);
      interaction.update({ embeds: [interaction.message.embeds[0], hEmbed] });
    }
  },
};
