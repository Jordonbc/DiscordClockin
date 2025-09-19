// Utility function to send DMs to admins with optional attachment
const sendDMsToAdmins = async (admins, embed, attachment = null, userId) => {
  // Send DMs with rate limiting and error handling
  const sendResults = await Promise.allSettled(
    admins.map(async (admin) => {
      try {
        const messageOptions = {
          content: `👤User: <@${userId}>`,
          embeds: [embed],
        };
        if (attachment) {
          messageOptions.files = [attachment];
        }

        await admin.send(messageOptions);
        console.log(`✅ Sent message to ${admin.user.tag}`);
        return { success: true, admin: admin.user.tag };
      } catch (err) {
        console.warn(`⚠️ Failed to send DM to ${admin.user.tag}:`, err.message);
        return {
          success: false,
          admin: admin.user.tag,
          error: err.message,
        };
      }
    })
  );

  // Log summary of message sending results
  const successCount = sendResults.filter(
    (result) => result.value?.success
  ).length;
  console.log(
    `📊 Message summary: ${successCount}/${admins.length} messages sent successfully`
  );

  return sendResults;
};

module.exports = { sendDMsToAdmins };
