const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const Workers = require("../models/worker.js");
const Roles = require("../models/roles.js");

async function register(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    // Check if the array/list of workers exists
    let workers = await Workers.findOne({ guildId: interaction.guild.id });

    // If the users are not found for the guild, create a new array/list
    if (!workers) {
      workers = new Workers({
        guildId: interaction.guild.id,
      });
      await workers.save();
    }

    // Check if the guild has existing roles
    const roles = await Roles.findOne({ guildId: interaction.guild.id });

    // If no roles are found, return an error message
    if (!roles || roles.categorys.length === 0) {
      const noRoles = new EmbedBuilder()
        .setTitle("ERROR: Clock in")
        .setColor("#FF0000")
        .setDescription("I can't register you, because no roles are existing.");

      return interaction.editReply({ embeds: [noRoles] });
    }

    // Check if the user is already registered
    let worker = workers.workers.find(
      (worker) => worker.userId === interaction.user.id
    );

    // If the user is already registered, return an error message
    if (worker) {
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(
          "You're already registered! You can just click `Clockin` to start working."
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // Create a new embed to send to the user
    const embed = new EmbedBuilder()
      .setTitle("New worker")
      .setDescription(
        "Hey, you are about to create your profile, please tell us what you work as?"
      )
      .setColor("#00FFFF");

    // populate the options for the select menu
    const options = roles.categorys.map((category) =>
      new StringSelectMenuOptionBuilder().setLabel(category).setValue(category)
    );

    // Create the select menu with the options
    const select = new StringSelectMenuBuilder()
      .setCustomId(`newWorker_category_menu-${interaction.guild.id}`) // Changed to match our handler ID
      .setPlaceholder("📌 » Which department do you work in?")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    // Send the embed and select menu to the user in a DM
    const userChat = await interaction.member.createDM();
    try {
      const msg = await userChat.send({ embeds: [embed], components: [row] });

      // Send a reply to the user in the guild to check their DMs
      await interaction.editReply({
        content: `[I have sent you a private message to continue](<${msg.url}>)`,
        flags: 64,
      });
    } catch (error) {
      // Handle DM send error
      await interaction.editReply({
        content:
          "I couldn't send you a DM. Please make sure your DMs are open.",
        flags: 64,
      });
    }
  } catch (error) {
    console.error("Error in register function:", error);
    await interaction.editReply({
      content:
        "An error occurred while processing your registration. Please try again.",
      flags: 64,
    });
  }
}

module.exports = register;
