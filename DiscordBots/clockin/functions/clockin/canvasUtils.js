const { AttachmentBuilder } = require("discord.js");
const Canvas = require("@napi-rs/canvas");
const { request } = require("undici");

/**
 * Draw text inside a box.
 */
function drawCenteredText(context, text, x, y, boxWidth, boxHeight, fontSize) {
  context.font = `${fontSize}px "Avilock"`;
  context.fillStyle = "#ffffff";
  const textWidth = context.measureText(text).width;
  const textX = x + (boxWidth - textWidth) / 2;
  const textY = y + (boxHeight + fontSize * 0.75) / 2;
  context.fillText(text, textX, textY);
}

/**
 * Draw a circular clipped image (for avatar).
 */
async function drawCircularImage(context, image, x, y, radius) {
  const size = radius * 2;
  const imageX = x - radius;
  const imageY = y - radius;

  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2, true);
  context.closePath();
  context.clip();
  context.drawImage(image, imageX, imageY, size, size);
  context.restore();
}

/**
 * Create the clock-in canvas.
 */
async function createClockInCanvas(worker, interaction, roleName, timeParts) {
  const [day, month, year, hour, minute, second] = timeParts;

  const canvas = Canvas.createCanvas(2132, 744);
  const context = canvas.getContext("2d");

  // Load the appropriate background
  const backgroundPath =
    interaction.guild.id === process.env.GUILD_ID
      ? "./banner_clockedIn_segritude.PNG"
      : "./banner_clockedIn.png";
  const background = await Canvas.loadImage(backgroundPath);
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  // Load and draw the user's avatar
  const { body } = await request(
    interaction.user.displayAvatarURL({ format: "png", size: 4096 })
  );
  const avatar = await Canvas.loadImage(await body.arrayBuffer());
  await drawCircularImage(context, avatar, 336, 378, 225);

  // Draw time components
  const boxWidth = 168;
  const boxHeight = 168;
  const baseX = 720;
  const baseY = 280;
  const xOffsets = [0, 188, 377, 656, 844, 1082]; // Offsets for hour, minute, etc.

  const timeValues = [hour, minute, second, day, month, year];
  timeValues.forEach((value, index) => {
    drawCenteredText(
      context,
      value,
      baseX + xOffsets[index],
      baseY,
      boxWidth,
      boxHeight,
      150
    );
  });

  // Draw worker role text
  drawCenteredText(context, roleName, 900, 495, 132, 132, 100);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "banner-image.png",
  });
}

module.exports = { drawCenteredText, drawCircularImage, createClockInCanvas };
