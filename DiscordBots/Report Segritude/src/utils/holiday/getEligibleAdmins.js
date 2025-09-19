// Utility function to get eligible admins
const getEligibleAdmins = async (client, guildId, adminRoleIds) => {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.log(`⚠️ Guild not found: ${guildId}`);
      return [];
    }

    // Fetch all admins with the botAdminRole more efficiently
    const admins = await guild.members.fetch();
    const eligibleAdmins = admins.filter((member) =>
      member.roles.cache.hasAny(...adminRoleIds)
    );

    if (!eligibleAdmins.size) {
      console.log(`⚠️ No bot admins found with role in Guild: ${guildId}`);
      return [];
    }

    return [...eligibleAdmins.values()];
  } catch (error) {
    console.error("Error getting eligible admins:", error);
    return [];
  }
};

module.exports = { getEligibleAdmins };
