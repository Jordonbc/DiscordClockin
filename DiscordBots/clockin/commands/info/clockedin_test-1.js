const Canvas = require("@napi-rs/canvas");
const { request } = require("undici");
const { AttachmentBuilder } = require("discord.js");
Canvas.GlobalFonts.registerFromPath(
  "./fonts/BebasNeue-Regular.ttf",
  "BebasNeue"
);

module.exports = {
  name: "clockin2",
  description: "Check bot's ping.",
  cooldown: 3000,
  userPerms: [],
  botPerms: [],
  run: async (client, message, args) => {
    const now = new Date(Date.now());
    let day = now.getDate().toString().padStart(2, "0");
    let month = (now.getMonth() + 1).toString().padStart(2, "0");
    let year = now.getFullYear();
    let hour = (now.getHours() + 1).toString().padStart(2, "0");
    const minute = now.getMinutes().toString().padStart(2, "0");
    const second = now.getSeconds().toString().padStart(2, "0");

    if (hour === "24") {
      hour = "0";
      day++;
      if (
        month === "1" ||
        month === "3" ||
        month === "5" ||
        month === "7" ||
        month === "8" ||
        month === "10" ||
        month === "12"
      ) {
        if (day === "32") {
          day = "1";
          month++;
          if (month === "13") {
            month = "1";
            year++;
          }
        }
      } else {
        if (month === "2") {
          if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
            if (day === "30") {
              day = "1";
              month++;
              if (month === "13") {
                month = "1";
                year++;
              }
            }
          } else {
            if (day === "29") {
              day = "1";
              month++;
              if (month === "13") {
                month = "1";
                year++;
              }
            }
          }
        } else {
          if (day === "31") {
            day = "1";
            month++;
            if (month === "13") {
              month = "1";
              year++;
            }
          }
        }
      }
    }

    const date = `${day}/${month}/${year}`;
    const time = `${hour}:${minute}:${second}`;

    const canvas = Canvas.createCanvas(4096, 1548);
    const context = canvas.getContext("2d");

    const background = await Canvas.loadImage("./clocked_in.png");

    // Zeichnen Sie das Hintergrundbild auf das gesamte Canvas
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    const { body } = await request(
      message.author.displayAvatarURL({ format: "png", size: 4096 })
    );
    const avatar = await Canvas.loadImage(await body.arrayBuffer());

    // Größe und Position des Benutzerbildes anpassen
    const avatarSize = 1200; // Ändern Sie die Größe nach Bedarf
    const avatarX = 187; // Ändern Sie die horizontale Position nach Bedarf
    const avatarY = (canvas.height - avatarSize) / 2; // Zentrieren Sie das Bild vertikal

    // Kreis ausschneiden
    context.save();
    context.beginPath();
    context.arc(
      avatarX + avatarSize / 2,
      canvas.height / 2,
      avatarSize / 2,
      0,
      Math.PI * 2,
      true
    );
    context.closePath();
    context.clip();

    // Benutzerbild zeichnen
    context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    context.restore();

    context.fillStyle = "#ffffff"; // Textfarbe
    context.font = '150px "BebasNeue"'; // Schriftart und Größe

    const textDate = `${date}`;
    const text1Width = context.measureText(textDate).width;
    const text1X = (canvas.width - text1Width) / 2; // Zentrieren Sie den Text horizontal
    const text1Y = 1000; // Vertikale Position
    context.fillText(textDate, text1X, text1Y);

    const textTime = `${time}`;
    const textTimeWidth = context.measureText(textTime).width;
    const textTimeX = (canvas.width - textTimeWidth) / 2; // Zentrieren Sie den Text horizontal
    const textTimeY = 1145; // Vertikale Position
    context.fillText(textTime, textTimeX, textTimeY);

    // Zweiter Text
    const text2 = "Developer";
    const text2Width = context.measureText(text2).width;
    const centerX = (2760 + 3735) / 2;
    const text2X = centerX - text2Width / 2;
    const text2Y = 1000; // Vertikale Position
    context.fillText(text2, text2X, text2Y);

    const textMoney = "£12.70p/h";
    const textMoneyWidth = context.measureText(text2).width;
    const MoneyCenterX = (2760 + 3735) / 2;
    const textMoneyX = MoneyCenterX - textMoneyWidth / 2;
    const textMoneyY = 1145; // Vertikale Position
    context.fillText(textMoney, textMoneyX, textMoneyY);

    const attachment = new AttachmentBuilder(await canvas.encode("png"), {
      name: "banner-image.png",
    });
    message.reply({ files: [attachment] });
  },
};
