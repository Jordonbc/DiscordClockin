const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { decodeInteractionState } = require("../utils/state");

module.exports = {
  id: "addrole_salaries",
  async execute(interaction, { api }) {
    const [, encoded] = interaction.customId.split(":");
    const state = decodeInteractionState(encoded);

    try {
      const hourlySalary = {};
      for (const [customId, value] of interaction.fields.fields.map((field) => [field.customId, field.value])) {
        const amount = Number.parseFloat(value.replace(",", "."));
        if (Number.isNaN(amount) || amount <= 0) {
          throw new Error("Hourly salary values must be positive numbers.");
        }
        hourlySalary[customId] = Number(amount.toFixed(2));
      }

      const response = await api.createRole({
        guildId: interaction.guildId,
        name: state.name,
        category: state.category,
        hourlySalary,
        experiences: Object.keys(hourlySalary),
      });

      const role = response.role;
      const embed = createSuccessEmbed(
        "**Successfully created the role!**\n" +
          `Role: **${role.name}**\nCategory: **${role.category}**`
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      const embed = createErrorEmbed(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
