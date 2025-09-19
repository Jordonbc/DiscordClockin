const { EmbedBuilder } = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
require("dotenv").config();
const ticketLogChannel = process.env.TICKET_LOG_CHANNEL;

// this button handler is called when the administrator closes the ticket
module.exports = {
  id: "contactHR_close_button",
  permissions: ["Administrator"],
  run: async (client, interaction) => {
    //if the interaction user was not an administrator, return an error message
    // if (!interaction.member.permissions.has("ADMINISTRATOR"))
    //   return interaction.reply({
    //     content: "You are not allowed to close this ticket!",
    //   });

    await interaction.reply({ content: "The ticket will be closed..." });

    const ticketLog = await interaction.guild.channels.cache.get(
      ticketLogChannel
    );

    const file = await createTranscript(interaction.channel, {
      limit: -1,
      returnBuffer: false,
      filename: `${interaction.channel.name}.html`,
      poweredBy: false,
    });

    const msg = await ticketLog.send({ files: [file] });
    const message = `Here is the [ticket transcript](https://mahto.id/chat-exporter?url=${
      msg.attachments.first()?.url
    })`;
    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setDescription(message)
      .setFooter({
        text: `${interaction.message.mentions.users.first().displayName}`,
        iconURL: interaction.message.mentions.users.first().displayAvatarURL(),
      });
    msg.edit({ embeds: [embed] });
    interaction.channel.delete();
  },
};
