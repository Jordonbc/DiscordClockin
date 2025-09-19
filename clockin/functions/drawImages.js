const Canvas = require("@napi-rs/canvas");
const { AttachmentBuilder } = require("discord.js");
const { request } = require("undici");
require("dotenv").config();

const guildId = process.env.GUILD_ID;

Canvas.GlobalFonts.registerFromPath(
  "./fonts/BebasNeue-Regular.ttf",
  "BebasNeue"
);
Canvas.GlobalFonts.registerFromPath("./fonts/Avilock Bold.ttf", "Avilock");

async function drawClockedin(guildId, user, workerRole) {
  const now = new Date();
  const londonTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);

  const timeParts = Object.fromEntries(
    londonTime.map(({ type, value }) => [type, value])
  );

  const canvas = Canvas.createCanvas(2132, 744);
  const context = canvas.getContext("2d");

  let background = "";
  if (guildId === guildId) {
    background = await Canvas.loadImage("./banner_clockedIn_segritude.PNG");
  } else {
    background = await Canvas.loadImage("./banner_clockedIn.png");
  }

  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  const { body } = await request(
    user.displayAvatarURL({ format: "png", size: 4096 })
  );
  const avatar = await Canvas.loadImage(await body.arrayBuffer());

  const avatarSize = 450;
  const circleX = 336;
  const circleY = 378;
  const circleRadius = 225;

  const avatarX = circleX - circleRadius + (circleRadius - avatarSize / 2);
  const avatarY = circleY - circleRadius + (circleRadius - avatarSize / 2);

  context.save();
  context.beginPath();
  context.arc(circleX, circleY, circleRadius, 0, Math.PI * 2, true);
  context.closePath();
  context.clip();
  context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  context.restore();

  context.fillStyle = "#ffffff";
  context.font = '150px "Avilock"';

  const hour = timeParts.hour;
  const minute = timeParts.minute;
  const second = timeParts.second;
  const day = timeParts.day;
  const month = timeParts.month;
  const year = timeParts.year;

  let boxWidth = 168;
  const boxHeight = 168;
  let boxX = 720;
  const boxY = 280;

  const hourWidth = context.measureText(hour).width;
  const hourX = boxX + (boxWidth - hourWidth) / 2;
  const hourY = boxY + (boxHeight + 125) / 2;
  context.fillText(hour, hourX, hourY);

  boxX = 908;
  const minuteWidth = context.measureText(minute).width;
  const minuteX = boxX + (boxWidth - minuteWidth) / 2;
  const minuteY = boxY + (boxHeight + 125) / 2;
  context.fillText(minute, minuteX, minuteY);

  boxX = 1097;
  const secondWidth = context.measureText(second).width;
  const secondX = boxX + (boxWidth - secondWidth) / 2;
  const secondY = boxY + (boxHeight + 125) / 2;
  context.fillText(second, secondX, secondY);

  boxX = 1376;
  const dayWidth = context.measureText(day).width;
  const dayX = boxX + (boxWidth - dayWidth) / 2;
  const dayY = boxY + (boxHeight + 125) / 2;
  context.fillText(day, dayX, dayY);

  boxX = 1564;
  const monthWidth = context.measureText(month).width;
  const monthX = boxX + (boxWidth - monthWidth) / 2;
  const monthY = boxY + (boxHeight + 125) / 2;
  context.fillText(month, monthX, monthY);

  boxX = 1752;
  boxWidth = 304;
  const yearWidth = context.measureText(year).width;
  const yearX = boxX + (boxWidth - yearWidth) / 2;
  const yearY = boxY + (boxHeight + 125) / 2;
  context.fillText(year, yearX, yearY);

  context.font = '100px "Avilock"';
  const text2 = `${workerRole?.name}`;
  const text2X = 572;
  const text2Y = 502 + (132 + 75) / 2;
  context.fillText(text2, text2X, text2Y);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "banner-image.png",
  });
}

async function drawAFK(guildId, user, workerRole) {
  const now = new Date();
  const londonTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);

  const timeParts = Object.fromEntries(
    londonTime.map(({ type, value }) => [type, value])
  );

  const canvas = Canvas.createCanvas(2132, 744);
  const context = canvas.getContext("2d");

  let background = "";
  if (guildId === guildId) {
    background = await Canvas.loadImage("./banner_onBreak_segritude.PNG");
  } else {
    background = await Canvas.loadImage("./banner_onBreak.png");
  }

  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  const { body } = await request(
    user.displayAvatarURL({ format: "png", size: 4096 })
  );
  const avatar = await Canvas.loadImage(await body.arrayBuffer());

  const avatarSize = 450;
  const circleX = 336;
  const circleY = 378;
  const circleRadius = 225;

  const avatarX = circleX - circleRadius + (circleRadius - avatarSize / 2);
  const avatarY = circleY - circleRadius + (circleRadius - avatarSize / 2);

  context.save();
  context.beginPath();
  context.arc(circleX, circleY, circleRadius, 0, Math.PI * 2, true);
  context.closePath();
  context.clip();
  context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  context.restore();

  context.fillStyle = "#ffffff";
  context.font = '150px "Avilock"';

  let boxWidth = 168;
  const boxHeight = 168;
  let boxX = 720;
  const boxY = 280;

  const hour = timeParts.hour;
  const minute = timeParts.minute;
  const second = timeParts.second;
  const day = timeParts.day;
  const month = timeParts.month;
  const year = timeParts.year;

  const hourWidth = context.measureText(hour).width;
  const hourX = boxX + (boxWidth - hourWidth) / 2;
  const hourY = boxY + (boxHeight + 125) / 2;
  context.fillText(hour, hourX, hourY);

  boxX = 908;
  const minuteWidth = context.measureText(minute).width;
  const minuteX = boxX + (boxWidth - minuteWidth) / 2;
  const minuteY = boxY + (boxHeight + 125) / 2;
  context.fillText(minute, minuteX, minuteY);

  boxX = 1097;
  const secondWidth = context.measureText(second).width;
  const secondX = boxX + (boxWidth - secondWidth) / 2;
  const secondY = boxY + (boxHeight + 125) / 2;
  context.fillText(second, secondX, secondY);

  boxX = 1376;
  const dayWidth = context.measureText(day).width;
  const dayX = boxX + (boxWidth - dayWidth) / 2;
  const dayY = boxY + (boxHeight + 125) / 2;
  context.fillText(day, dayX, dayY);

  boxX = 1564;
  const monthWidth = context.measureText(month).width;
  const monthX = boxX + (boxWidth - monthWidth) / 2;
  const monthY = boxY + (boxHeight + 125) / 2;
  context.fillText(month, monthX, monthY);

  boxX = 1752;
  boxWidth = 304;
  const yearWidth = context.measureText(year).width;
  const yearX = boxX + (boxWidth - yearWidth) / 2;
  const yearY = boxY + (boxHeight + 125) / 2;
  context.fillText(year, yearX, yearY);

  context.font = '100px "Avilock"';
  const text2 = `${workerRole?.name}`;
  const text2X = 572;
  const text2Y = 502 + (132 + 75) / 2;
  context.fillText(text2, text2X, text2Y);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "banner-image.png",
  });
}

module.exports = { drawClockedin, drawAFK };
