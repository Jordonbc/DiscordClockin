const { EmbedBuilder } = require("discord.js");
const GuildSettings = require("../models/guildSettings"); // Adjust path as needed

// this modal handler is called when the admin denies a time off request
module.exports = {
  id: "timeOff_deny_modal",
  run: async (client, interaction) => {
    await interaction.deferReply({ content: "*Please wait...*" });

    const reason = interaction.fields.getTextInputValue("reason_input");
    const user = interaction.message.mentions.users.first();

    const guildSettings = await GuildSettings.findOne({
      guildId: interaction.guildId,
    });

    if (!guildSettings || !guildSettings.botAdminRole) {
      return interaction.editReply({
        content: "Error: No admin roles configured!",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("Time Off Request Declined")
      .setDescription(
        `
		A time off request has been rejected.
  
		**Requester:** ${user.username}
		**Reason for Denial:**
		${reason}
	  `
      )
      .setColor("#da0b0b")
      .setFooter({ text: `Reviewed by: ${interaction.user.username}` });

    await user.send({
      embeds: [embed],
      content: "You got a response on your time off request!",
    });

    const guild = await client.guilds.fetch(interaction.guildId);
    const adminUserIds = new Set(); // Use a Set to track unique admin users

    for (const adminRoleId of guildSettings.botAdminRole) {
      const role = await guild.roles.fetch(adminRoleId);

      if (role) {
        for (const [memberId, member] of role.members) {
          // Only send DM if not already sent and not the denier
          if (
            !adminUserIds.has(memberId) &&
            member.user.id !== interaction.user.id
          ) {
            adminUserIds.add(memberId);
            await member.send({ embeds: [embed] }).catch(console.error);
          }
        }
      }
    }

    await interaction.editReply({ content: ":white_check_mark: Finished!" });
    await interaction.channel.delete();
  },
};
