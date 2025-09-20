function encodeInteractionState(payload) {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

function decodeInteractionState(encoded) {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch (error) {
    throw new Error("Failed to decode interaction state");
  }
}

module.exports = {
  encodeInteractionState,
  decodeInteractionState,
};
