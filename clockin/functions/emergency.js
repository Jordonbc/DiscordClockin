const emergency = async (interaction) => {
  if (interaction.guildId === null)
    return interaction.reply("This command can only be used in a server.");

  return interaction.reply({
    content: "You got an emergency leave 🏥. This is a test commit boom!",
    flags: 64,
  });
};

module.exports = emergency;
