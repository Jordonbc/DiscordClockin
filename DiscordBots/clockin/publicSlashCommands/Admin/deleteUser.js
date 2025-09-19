const { EmbedBuilder, ApplicationCommandType } = require("discord.js");
const mongoose = require("mongoose");
const Worker = require("../../models/worker.js");

module.exports = {
  name: "deleteuser",
  description: "» Delete all data from a user",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  default_member_permissions: "Administrator",
  category: "Admin",
  options: [
    {
      name: "userid",
      description: "Type the Id from the user which you want delete",
      type: 3,
      required: true,
    },
  ],
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const userid = interaction.options.get("userid").value;

    const users = await Worker.findOne({ guildId: interaction.guild.id });
    const userIndex = users.workers.findIndex(
      (worker) => worker.userId === userid
    );
    if (userIndex !== -1) {
      // Löschen des Workers aus dem Array
      users.workers.splice(userIndex, 1);
      await users.save();
    } else {
      const notFound = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription("No user found");

      return interaction.editReply({ embeds: [notFound] });
    }

    const found = new EmbedBuilder()
      .setColor("Green")
      .setDescription("✅ Successfully deleted");

    interaction.editReply({ embeds: [found] });
  },
};
