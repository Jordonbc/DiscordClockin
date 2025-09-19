const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ChannelType,
  PermissionFlagsBits,
  codeBlock,
} = require("discord.js");
require("dotenv").config();
const WorkerSchema = require("../models/worker");
const RolesSchema = require("../models/roles");

const ticketViewRole = process.env.TICKET_VIEW_ROLE;

module.exports = {
  id: "contact_hr_modal",
  //permissions: [],
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    // Get the concern from the description input/option
    const concern = interaction.fields.getTextInputValue("description");

    // Fetch the workers for the specific guild
    const workers = await WorkerSchema.findOne({
      guildId: interaction.guild.id,
    });

    // Find the worker by the user id from the worker array
    const worker = workers.workers.find(
      (worker) => worker.userId === interaction.user.id
    );

    // Find the role by the role id from the roles array
    const roles = await RolesSchema.findOne({ guildId: interaction.guild.id });
    const role = roles.roles.find((role) => role.id === worker?.roleId);

    // If the worker or role is not found, return an error message
    if (!worker || !role) {
      const notFound = new EmbedBuilder()
        .setColor("#ff0000")
        .setDescription("You are not a registered worker.");

      return interaction.editReply({ embeds: [notFound] });
    }

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle("**__CONTACT HUMAN RESSOURCES__**")
      .setDescription(
        `\`👤\` **From:** › ${interaction.user}
\`💼\` **Role:** › ${role.name || "None"}
\`🎭\` **Experience:** › ${worker.experience || "None"}
\`📛\` **Concern:** ›\n${codeBlock(concern)}`
      )
      .setFooter({
        text: interaction.user.displayName,
        iconURL: interaction.user.displayAvatarURL(),
      });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Close")
        .setStyle("Danger")
        .setCustomId("contactHR_close_button"),
      new ButtonBuilder()
        .setLabel("Worker Profile")
        .setStyle("Secondary")
        .setCustomId("contactHR_profile_button")
    );

    const channel = await interaction.guild.channels.create({
      name: interaction.user.displayName,
      type: ChannelType.GuildText,
      parent: interaction.channel.parentId,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
        {
          id: ticketViewRole,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
      ],
    });

    channel
      .send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [buttons],
      })
      .then((msg) => {
        msg.pin();

        const createdTicket = new EmbedBuilder()
          .setColor("Green")
          .setDescription(
            `I successfully created a ticket for you! [Click me](${msg.url}) to go directly to your ticket.`
          );

        interaction.editReply({ embeds: [createdTicket] });
      });
  },
};
