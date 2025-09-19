const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const Workers = require("../models/worker.js");
const Roles = require("../models/roles.js");
require("dotenv").config();

const ticketCategoryId = process.env.TICKET_CATEGORY_ID;

// this handler is called when the user submits the time off request modal
module.exports = {
  id: "requestTimeOff_modal",
  //permissions: [],
  run: async (client, interaction) => {
    //function to check if the date is valid
    function isValidDate(dateString) {
      // Splitting the date string into day, month and year
      const [day, month, year] = dateString.split("/").map(Number);

      // Create a Date object with the decomposed date
      const date = new Date(year, month - 1, day);

      // Check whether the Date object is valid and the date was parsed correctly
      return (
        !isNaN(date.getTime()) &&
        date.getDate() === day &&
        date.getMonth() === month - 1 &&
        date.getFullYear() === year
      );
    }

    //function to check if the date is in the past
    function inThePast(dateString) {
      const [day, month, year] = dateString.split("/").map(Number);

      const date = new Date(year, month - 1, day);
      const currentDate = new Date.now();

      // Check whether the Date object is valid and the date was parsed correctly
      return date < currentDate;
    }

    //function to check if the end date is before the start date
    function inThePast(dateString) {
      const [day, month, year] = dateString.split("/").map(Number);

      const date = new Date(year, month - 1, day);

      const currentDate = new Date();

      currentDate.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      return date < currentDate;
    }

    //function to check if the end date is before the start date
    function wrongSequenz(startDate, endDate) {
      const [day, month, year] = startDate.split("/").map(Number);
      const [dayEnd, monthEnd, yearEnd] = endDate.split("/").map(Number);

      const formattedDateStart = new Date(year, month - 1, day);
      const formattedDateEnd = new Date(yearEnd, monthEnd - 1, dayEnd);

      return formattedDateStart >= formattedDateEnd;
    }

    await interaction.deferReply({
      ephemeral: true,
      content: "*Please wait...*",
    });

    // fetch reason and date inputs from the modal
    const reason = interaction.fields.getTextInputValue("reason_input");
    const start = interaction.fields.getTextInputValue("start_input");
    const end = interaction.fields.getTextInputValue("end_input");

    // fetch the workers array for the guild
    const GuildWorkers = await Workers.findOne({
      guildId: interaction.guild.id,
    });

    //fetch the worker from the array
    const worker = GuildWorkers.workers.find(
      (worker) => worker.userId === interaction.user.id
    );

    if (
      worker.onLeave?.end >= start &&
      (worker.onLeave.start !== null || worker.onLeave.end !== null)
    )
      return interaction.editReply({
        content: "You already have a time off request in this period",
      });

    // check if the date inputs are valid
    if (!isValidDate(start) || !isValidDate(end)) {
      return interaction.editReply({
        content:
          "Your date inputs are incorrect please write it in following format:\n`dd/mm/yyyy`",
      });
    }
    if (inThePast(start) || inThePast(end)) {
      return interaction.editReply({
        content: "Your date inputs are in the past!",
      });
    }
    if (wrongSequenz(start, end)) {
      return interaction.editReply({
        content: "The end date begins before the start date",
      });
    }

    //Find the roles of the guild
    const GuildRoles = await Roles.findOne({ guildId: interaction.guild.id });

    //Find the role of the worker
    const role = GuildRoles.roles.find((role) => role.id === worker.roleId);

    //create the ticket embed
    const ticketEmbed = new EmbedBuilder()
      .setTitle("Time Off Request")
      .setDescription(
        `
		      **Name:** ${interaction.user.username}
		      **Role** ${role.name}
		      **Discord ID:** ${interaction.user.id}
		      **Description:** ${reason}
		    `
      )
      .setColor("#117b85")
      .addFields(
        {
          name: "Start Date",
          value: start,
          inline: true,
        },
        {
          name: "End Date",
          value: end,
          inline: true,
        }
      );

    //create the ticket channel
    interaction.guild.channels
      .create({
        name: `request-${interaction.user.username}`,
        type: 0,
        parent: ticketCategoryId, //replace with your category id
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ["ViewChannel"],
          },
        ],
      })
      .then((channel) => {
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Accept")
            .setStyle("Success")
            .setCustomId("timeOff_accept_button"),
          new ButtonBuilder()
            .setLabel("Deny")
            .setStyle("Danger")
            .setCustomId("timeOff_deny_button")
        );

        channel.send({
          embeds: [ticketEmbed],
          content: `<@${interaction.user.id}>`,
          components: [buttons],
        });
      });

    //send the response to the user to wait for the review
    const embed = new EmbedBuilder()
      .setTitle("Thank you for submitting")
      .setDescription(
        `
			Your request has been send over to Segritude for review, please wait patiently while your request is being reviewed by our team.
			You shall receive a response from the bot with an answer to your request
		`
      )
      .setColor("#288d0f")
      .setFooter({ text: "Submitted on" })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
