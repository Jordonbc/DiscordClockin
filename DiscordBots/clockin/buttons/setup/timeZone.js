const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

// this button is present in the embed created on running the /setup-status command
module.exports = {
  id: "setup_timeZone_button",
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    const embed = new EmbedBuilder()
      .setColor("#81e6ff")
      .setDescription("Choose a timezone for your server");

    // Updated list of famous timezones with IANA-compliant identifiers
    const timeZones = [
      { label: "UTC (Coordinated Universal Time)", value: "Etc/UTC" },
      { label: "London (GMT)", value: "Europe/London" },
      { label: "New York (Eastern Time)", value: "America/New_York" },
      { label: "Chicago (Central Time)", value: "America/Chicago" },
      { label: "Los Angeles (Pacific Time)", value: "America/Los_Angeles" },
      { label: "Tokyo (Japan Standard Time)", value: "Asia/Tokyo" },
      { label: "Sydney (Australian Eastern Time)", value: "Australia/Sydney" },
      { label: "Kolkata (India Standard Time)", value: "Asia/Kolkata" },
      { label: "Berlin (Central European Time)", value: "Europe/Berlin" },
      { label: "Shanghai (China Standard Time)", value: "Asia/Shanghai" },
    ];

    // Create a select menu with the timezones
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("setup_timeZone_select")
        .setPlaceholder("Select a timezone")
        .addOptions(
          timeZones.map(({ label, value }) => ({
            label,
            value,
          }))
        )
    );

    interaction.editReply({ embeds: [embed], components: [row] });
  },
};
