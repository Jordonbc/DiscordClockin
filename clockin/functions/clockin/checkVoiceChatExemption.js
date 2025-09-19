const { EmbedBuilder } = require("discord.js");

async function checkVoiceChatExemption(interaction, guildSettings) {
  if (
    !interaction.member.roles.cache.some((role) =>
      guildSettings?.voiceExemptRole?.includes(role.id)
    )
  ) {
    console.log("I am exempted but still reached here");

    if (
      !guildSettings?.workerVoiceChats?.includes(
        interaction.member?.voice?.channelId
      ) &&
      guildSettings?.workerVoiceChats?.length > 0
    ) {
      const voiceChannelString = guildSettings.workerVoiceChats
        .map((id) => `- <#${id}>`)
        .join("\n");

      const voiceChatEmbed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(
          `You need to be in one of the following voice chats to clock in:\n${voiceChannelString}`
        );

      return { success: false, embed: voiceChatEmbed };
    }
  }

  return { success: true };
}

module.exports = { checkVoiceChatExemption };
