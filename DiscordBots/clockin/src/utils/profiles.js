function normalize(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function withNullSafe(value, fallback) {
  return value ?? fallback ?? null;
}

function buildInteractionProfile(interaction) {
  if (!interaction) {
    return null;
  }

  const user = interaction.user || interaction.author || interaction.member?.user;
  if (!user) {
    return null;
  }

  const member = interaction.member || null;

  const username = normalize(user.username);
  const globalName = normalize(user.globalName ?? user.global_name);
  const memberDisplay = normalize(withNullSafe(member?.displayName, member?.nickname));
  const displayName = memberDisplay || normalize(user.displayName ?? user.globalName);
  const nickname = normalize(member?.nickname);
  const discriminatorRaw = normalize(user.discriminator);
  const discriminator = discriminatorRaw === "0" ? null : discriminatorRaw;
  const userTag = normalize(typeof user.tag === "string" ? user.tag : null);

  const profile = {
    username,
    global_name: globalName,
    display_name: displayName,
    nickname,
    discriminator,
    user_tag: userTag,
  };

  const entries = Object.entries(profile).filter(([, value]) => Boolean(value));
  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries);
}

module.exports = {
  buildInteractionProfile,
};
