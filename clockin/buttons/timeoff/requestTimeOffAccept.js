const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Workers = require("../../models/worker.js");
const Roles = require("../../models/roles.js");
const Settings = require("../../models/guildSettings.js");
// const { holidaysEventStart } = require("../../functions/holidays.js");
const { handleHoliday } = require("../../functions/holiday/handleHoliday.js");

// this button handler is called when the admin approves a time off request
module.exports = {
  id: "timeOff_accept_button",
  permissions: ["Administrator"],
  run: async (client, interaction) => {
    await interaction.deferReply({ content: "*Please wait...*" });

    const user = interaction.message.mentions.users.first();
    const approver = interaction.user; // The admin who clicked the button
    const approvalTime = new Date().toLocaleString(); // Current time

    const parts = interaction.message.embeds[0].description.split("\n");
    const descriptionIndex = parts.findIndex((part) =>
      part.includes("**Description:**")
    );
    const description =
      descriptionIndex !== -1
        ? parts.slice(descriptionIndex + 1).join("\n")
        : "";

    const guildSettings = await Settings.findOne({
      guildId: interaction.guild.id,
    });

    const workerGuild = await Workers.findOne({
      guildId: interaction.guild.id,
    });

    const worker = workerGuild.workers.find(
      (worker) => worker.userId === user.id
    );

    // Update the worker's onLeave start and end dates
    worker.onLeave.start = interaction.message.embeds[0].fields[0].value;
    worker.onLeave.end = interaction.message.embeds[0].fields[1].value;

    await workerGuild.save();

    const guildRoles = await Roles.findOne({ guildId: interaction.guild.id });
    const role = guildRoles.roles.find((role) => role.id === worker.roleId);

    const fileContent =
      `📝 [Time off Request]\n` +
      `👤 Name: ${user.username}\n` +
      `🏷️ Role: ${role.name}\n` +
      `🆔 Discord ID: ${user.id}\n` +
      `📝 Description: ${description}\n` +
      `📅 Start Date: ${interaction.message.embeds[0].fields[0].value} | 🏁 End Date: ${interaction.message.embeds[0].fields[1].value}\n\n` +
      `✅ [Approval Details]\n` +
      `🛡️ Approved by: ${approver.username} (${approver.id})\n` +
      `⏰ Approved at: ${approvalTime}`;

    // start bullmq delayed job
    handleHoliday(
      interaction.message.embeds[0].fields[0].value, //start date
      interaction.message.embeds[0].fields[1].value, //end date
      user.id,
      interaction.guild.id,
      fileContent
    );

    // Original confirmation embed for the requesting user
    const userEmbed = new EmbedBuilder()
      .setColor("#13aa05")
      .setTitle("Request Approved")
      .setDescription("Your request has been reviewed and approved.")
      .addFields(
        {
          name: "Start Date",
          value: interaction.message.embeds[0].fields[0].value,
        },
        {
          name: "End Date",
          value: interaction.message.embeds[0].fields[1].value,
        },
        {
          name: "Approved By",
          value: approver.username,
        }
      );

    user.send({
      embeds: [userEmbed],
      content: "You got a answer on your time off request!",
    });

    await interaction.editReply({ content: ":white_check_mark: Finished!" });
    interaction.channel.delete();
  },
};
