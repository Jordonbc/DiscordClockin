const { EmbedBuilder } = require("discord.js");
const Messages = require("../../models/messageIds.js");
const connectToDatabase = require("../../utils/database/db.js");

module.exports = {
  name: "setup-list",
  description: "Sets up the active workers and holiday list",

  callback: async (client, interaction) => {
    try {
      await interaction.deferReply({ flags: 64 });

      //connect to the database
      await connectToDatabase();

      //create the embed
      const embedWorkers = new EmbedBuilder()
        .setTitle("**List of working members and those on leave**")
        .addFields(
          // list of working members
          {
            name: "⚒️ __Working__",
            value: "`None`",
            inline: true,
          },
          {
            name: "🍹On Break",
            value: "`None`",
            inline: true,
          },
          // list of members on leave
          {
            name: "✈️ __On leave__",
            value: "`None`",
            inline: true,
          }
        )
        .setColor("#00FF00")
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });

      const message = await interaction.channel.send({
        embeds: [embedWorkers],
      });

      //save the message id in the database
      await Messages.findOneAndUpdate(
        { name: "clockIn", guildId: interaction.guild.id }, // Query
        {
          id: message.id,
          channelId: interaction.channel.id,
          guildId: interaction.guild.id,
        }, // Update fields
        { upsert: true, new: true } // Create if not exists, return updated document
      );

      await interaction.editReply({
        content: "The list has been set up!",
        flags: 64,
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
