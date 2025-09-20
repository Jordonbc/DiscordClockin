const { handleSupportModal } = require("../workflows/support");

module.exports = {
  id: "support_issue_modal",
  async execute(interaction) {
    await handleSupportModal(interaction, "issue");
  },
};
