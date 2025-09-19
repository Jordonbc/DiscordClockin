const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const Worker = require("../models/worker.js");

// this function is called when the user clicks on the timeoff button present in the clockin embed
async function requestTimeOff(interaction) {
  // Fetch the workers array
  const GuildWorkers = await Worker.findOne({ guildId: interaction.guild.id });

  // Fetch the specific worker from the array based on the user id
  const worker = GuildWorkers.workers.find(
    (worker) => worker.userId === interaction.user.id
  );

  // If the worker is not found, send a message to create an account first
  if (!worker) {
    return interaction.reply({
      content: "Please create your account first.",
      ephemeral: true,
    });
  }

  // If the worker is found, create a modal to request time off
  const modal = new ModalBuilder()
    .setCustomId("requestTimeOff_modal")
    .setTitle("🕖 | Request Time Off");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason_input")
    .setLabel("Why you need time off?")
    .setMaxLength(1200)
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const startInput = new TextInputBuilder()
    .setCustomId("start_input")
    .setLabel("From when are you going to be unavailable?")
    .setPlaceholder("dd/mm/yyyy")
    .setMaxLength(10)
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const endInput = new TextInputBuilder()
    .setCustomId("end_input")
    .setLabel("When are you coming back?")
    .setPlaceholder("dd/mm/yyyy")
    .setMaxLength(10)
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
  const secondActionRow = new ActionRowBuilder().addComponents(startInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(endInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
}

module.exports = { requestTimeOff };
