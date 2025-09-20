const { handleSupportModal } = require("../workflows/support");

module.exports = {
  id: "support_suggestion_modal",
  async execute(interaction) {
    await handleSupportModal(interaction, "suggestion");
  },
};
