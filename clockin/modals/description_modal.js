const { ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const MODAL_ID = "desc_modal"

// Create the modal
const modal = new ModalBuilder()
    .setCustomId('desc_modal')
    .setTitle('Work Description');

// Add components to modal

// Create the text input components
const favoriteColorInput = new TextInputBuilder()
    .setCustomId('worker_description')
    // The label is the prompt the user sees for this input
    .setLabel("What have you accomplished today?")
    // Short means only a single line of text
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1024);

// An action row only holds one text input,
// so you need one action row per text input.
const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);

// Add inputs to the modal
modal.addComponents(firstActionRow);

module.exports = {
    id: MODAL_ID,
    modal
};