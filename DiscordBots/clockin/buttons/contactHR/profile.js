const { showProfile } = require("../../functions/showBalance");

module.exports = {
  id: "contactHR_profile_button",
  permissions: ["Administrator"],
  run: async (client, interaction) => {
    console.log("I was clicked - the hr button");
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.message.mentions.users.first();

    const { embeds, buttons } = await showProfile(user, interaction.guild.id);

    interaction.editReply({ embeds: embeds, components: buttons });
  },
};
