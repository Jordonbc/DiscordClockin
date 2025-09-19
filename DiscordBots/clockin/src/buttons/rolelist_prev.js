const { decodeInteractionState, encodeInteractionState } = require("../utils/state");
const { buildRolePage } = require("../commands/admin/rolelist");

module.exports = {
  id: "rolelist_prev",
  async execute(interaction) {
    const [, encoded] = interaction.customId.split(":");
    const state = decodeInteractionState(encoded);

    const previousPage = Math.max(0, state.page - 1);
    const nextState = encodeInteractionState({
      ...state,
      page: previousPage,
    });

    const payload = buildRolePage({
      roles: state.roles,
      experiences: state.experiences,
      page: previousPage,
    });

    payload.components[0].components[0].setCustomId(`rolelist_prev:${nextState}`);
    payload.components[0].components[1].setCustomId(`rolelist_next:${nextState}`);

    await interaction.update(payload);
  },
};
