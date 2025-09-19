const {
  EmbedBuilder,
  ApplicationCommandType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const nodemailer = require("nodemailer");

module.exports = {
  name: "send",
  description: "For updates (Black_Wither only)",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  run: async (client, interaction) => {
    const embed = new EmbedBuilder().setTitle("T");
    interaction.channel.send({ embeds: [embed] });

    interaction.reply({ content: ":white_check_mark:", ephemeral: true });

    const transporter = nodemailer.createTransport({
      host: "mail.web.de",
      port: 587,
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
      debug: true,
      auth: {
        user: "j.otto.80@web.de",
        pass: "...",
      },
    });

    const mailOptions = {
      from: "j.otto.80@web.de",
      to: "kamiloszchuchro@gmail.com",
      subject: "Sending Email using Node.js",
      text: "That was easy!",
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  },
};
