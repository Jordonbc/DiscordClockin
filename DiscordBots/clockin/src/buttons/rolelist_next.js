const { decodeInteractionState, encodeInteractionState } = require("../utils/state");
const { buildRolePage } = require("../commands/admin/rolelist");

module.exports = {
  id: "rolelist_next",
  async execute(interaction) {
    const [, encoded] = interaction.customId.split(":");
    const state = decodeInteractionState(encoded);

    const totalPages = Math.ceil(state.roles.length / 5);
    const nextPage = Math.min(totalPages - 1, state.page + 1);
    const nextState = encodeInteractionState({
      ...state,
      page: nextPage,
    });

    const payload = buildRolePage({
      roles: state.roles,
      experiences: state.experiences,
      page: nextPage,
    });

    payload.components[0].components[0].setCustomId(`rolelist_prev:${nextState}`);
    payload.components[0].components[1].setCustomId(`rolelist_next:${nextState}`);

    await interaction.update(payload);
  },
};
