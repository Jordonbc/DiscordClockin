const {
  EmbedBuilder,
  ApplicationCommandType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const fs = require("fs");

module.exports = {
  name: "fix",
  description: "For updates (Black_Wither only)",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  default_member_permissions: "Administrator",
  options: [
    {
      name: "fix_color",
      description: "Embed color",
      type: 3,
      required: true,
      choices: [
        {
          name: "Green",
          value: "fix_green_choices",
        },
        {
          name: "Red",
          value: "fix_red_choices",
        },
      ],
    },
  ],
  run: async (client, interaction) => {
    const color = interaction.options.getString("fix_color");

    interaction.deferReply({ content: "abc" });
    aksnd;

    return;

    if (interaction.user.id === "810579335727677472") {
      if (color === "fix_green_choices") {
        const modal = new ModalBuilder()
          .setCustomId("fix_green_modal")
          .setTitle("📑 | Work description");

        const workInput = new TextInputBuilder()
          .setCustomId("fix_input")
          .setLabel("What have you accomplished today?")
          .setMaxLength(1200)
          .setRequired(true)

          .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder().addComponents(workInput);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      } else if (color === "fix_red_choices") {
        const modal = new ModalBuilder()
          .setCustomId("fix_red_modal")
          .setTitle("📑 | Work description");

        const workInput = new TextInputBuilder()
          .setCustomId("fix_input")
          .setLabel("What have you accomplished today?")
          .setMaxLength(1200)
          .setRequired(true)

          .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder().addComponents(workInput);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      }
    }
  },
};
