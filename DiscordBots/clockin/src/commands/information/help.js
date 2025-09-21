const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Show command help"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("Clockin help")
      .setDescription(
        "Here's a quick overview of the available commands. Use `/setup-status` to configure the bot and `/setup` to post the worker panel."
      )
      .addFields(
        {
          name: "Worker commands",
          value: "`/clock in`, `/clock out`, `/clock break start|end`, `/clock status`, `/register`",
        },
        {
          name: "Admin setup",
          value:
            "`/setup`, `/setup-status`, `/setup-log`, `/addrole`, `/addexperience`, `/removeexperience`, `/setplan` (coming soon)",
        },
        {
          name: "Admin management",
          value: "`/addhours`, `/removehours`, `/change-role`, `/deleteuser`, `/delete`, `/rolelist`, `/showusers`, `/showclockedin`",
        },
        {
          name: "Information",
          value: "`/profile`, `/weeklyreport`, `/ping`, `/bot-info`",
        }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
