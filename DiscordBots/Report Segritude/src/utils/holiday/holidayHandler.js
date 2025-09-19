const { EmbedBuilder } = require("discord.js");
const GuildSettings = require("../../models/guildSettings");
const { getEligibleAdmins } = require("../../utils/holiday/getEligibleAdmins");
const { sendDMsToAdmins } = require("../../utils/holiday/sendDmToAdmin");
const {
  createHolidayAttachment,
} = require("../../utils/holiday/createHolidayAttachment");

// 📌 Handles the "holidayStart" job
async function handleHolidayStart(job, client) {
  const { userId, guildId, fileContent } = job.data;
  console.log(
    `Processing holiday start for User: ${userId}, Guild: ${guildId}`
  );

  const guildSettings = await GuildSettings.findOne({ guildId }).lean();
  if (!guildSettings?.botAdminRole?.length) {
    console.log(`⚠️ No bot admin roles found for Guild: ${guildId}`);
    return;
  }

  const attachment = await createHolidayAttachment(fileContent, userId);
  const admins = await getEligibleAdmins(
    client,
    guildId,
    guildSettings.botAdminRole
  );
  if (!admins.length) return;

  const embed = new EmbedBuilder()
    .setTitle("🏖️ Holiday Started")
    .setColor("#4CAF50")
    .setDescription(`A user has started their holiday.`)
    .addFields(
      { name: "👤 User", value: `<@${userId}>`, inline: true },
      {
        name: "📅 Start Time",
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: true,
      }
    )
    .setTimestamp();

  if (attachment) {
    embed.addFields({
      name: "📝 Note",
      value: "Holiday details are attached to this message",
      inline: false,
    });
  }

  await sendDMsToAdmins(admins, embed, attachment);
}

// 📌 Handles the "holidayEnd" job
async function handleHolidayEnd(job, client) {
  const { userId, guildId, startDate, endDate } = job.data;
  console.log(`Processing holiday end for User: ${userId}, Guild: ${guildId}`);

  const guildSettings = await GuildSettings.findOne({ guildId }).lean();
  if (!guildSettings?.botAdminRole?.length) {
    console.log(`⚠️ No bot admin roles found for Guild: ${guildId}`);
    return;
  }

  const admins = await getEligibleAdmins(
    client,
    guildId,
    guildSettings.botAdminRole
  );
  if (!admins.length) return;

  const embed = new EmbedBuilder()
    .setTitle("📢 Holiday Ended")
    .setColor("#F44336")
    .setDescription(`A user's holiday has ended.`)
    .addFields(
      { name: "👤 User", value: `<@${userId}>`, inline: true },
      {
        name: "📅 Start Date",
        value: `<t:${Math.floor(new Date(startDate).getTime() / 1000)}:F>`,
        inline: true,
      },
      {
        name: "📅 End Date",
        value: `<t:${Math.floor(new Date(endDate).getTime() / 1000)}:F>`,
        inline: true,
      }
    )
    .setTimestamp();

  await sendDMsToAdmins(admins, embed);
}

module.exports = { handleHolidayStart, handleHolidayEnd };
