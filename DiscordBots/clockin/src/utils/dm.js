const FALLBACK_MESSAGE =
  "I couldn't send you a DM. Check your privacy settings if you'd like me to reach you there.";

async function trySendDirectMessage(user, payload) {
  if (!user || typeof user.send !== "function") {
    return false;
  }

  try {
    await user.send(payload);
    return true;
  } catch (error) {
    if (error?.code !== 50007) {
      console.warn(`Failed to DM user ${user?.id || "unknown"}`, error);
    }
    return false;
  }
}

async function notifyUserDm(interaction, payload, { failureMessage = FALLBACK_MESSAGE } = {}) {
  const sent = await trySendDirectMessage(interaction?.user, payload);
  if (!sent && failureMessage) {
    const messagePayload = { content: failureMessage, ephemeral: true };

    try {
      if (interaction?.replied || interaction?.deferred) {
        await interaction.followUp(messagePayload);
      } else if (interaction) {
        await interaction.reply(messagePayload);
      }
    } catch (error) {
      console.warn("Failed to send DM failure notice", error);
    }
  }

  return sent;
}

module.exports = {
  notifyUserDm,
  trySendDirectMessage,
};
