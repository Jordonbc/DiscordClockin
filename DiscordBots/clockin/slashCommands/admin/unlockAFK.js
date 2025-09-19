const {
  ActionRowBuilder,
  ButtonBuilder,
  ApplicationCommandType,
} = require("discord.js");

module.exports = {
  name: "unlock-afk",
  description: "For updates (Black_Wither only)",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "user",
      description: "Which user you would unlock?",
      type: 6,
      required: true,
    },
    {
      name: "messageid",
      description: "Type in the message ids",
      type: 3,
      required: true,
    },
  ],
  default_member_permissions: "Administrator",
  run: async (client, interaction) => {
    const user = interaction.options.get("user").user;
    const messageId = interaction.options.get("messageid").value;

    const userChannel = await user.createDM();
    const msg = await userChannel.messages.fetch(messageId);
    if (!msg)
      return interaction.reply({
        content: "No message found",
        ephemeral: true,
      });
    const clockInButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Clock out")
        .setStyle("Danger")
        .setDisabled(false)
        .setCustomId("clockout_new_button"),
      new ButtonBuilder()
        .setLabel(msg.components[0].components[1].label)
        .setStyle("Secondary")
        .setDisabled(false)
        .setCustomId("break_new_button")
    );
    msg.edit({ components: [clockInButtons] });
    interaction.reply({ content: ":white_check_mark:", ephemeral: true });
  },
};
