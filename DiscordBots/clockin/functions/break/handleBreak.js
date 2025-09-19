const { ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { drawAFK, drawClockedin } = require("../../functions/drawImages.js");
const { removeDelayedJob } = require("../../functions/handleDelayedJob.js");
const {
  handleAfkSystem,
} = require("../../functions/afkSystem/handleAfkSystem");
const { EmbedBuilder } = require("discord.js");
const handleWorkerEvents = require("../handleWorkerEvents.js");

async function handleBreakStart(interaction, worker, workers, workerRole) {
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Clock out")
      .setStyle("Danger")
      .setCustomId("clockout_new_button"),
    new ButtonBuilder()
      .setLabel("I'm back")
      .setStyle("Secondary")
      .setCustomId("break_new_button")
  );

  await handleWorkerEvents("break", worker.userId, workers.guildId);

  await interaction.message.edit({
    components: [buttons],
    files: [await drawAFK(workers.guildId, interaction.user, workerRole)],
  });

  await interaction.editReply({
    content: "You are now on break.",
    ephemeral: true,
  });

  //REMOVE THE DELAYED JOB
  await removeDelayedJob(worker.userId, interaction.message.id);
}

async function handleBreakEnd(
  client,
  interaction,
  worker,
  workers,
  settings,
  workerRole,
  clockInData
) {
  const guild = client.guilds.cache.get(workers.guildId);
  const member = guild.members.cache.get(interaction.user.id);

  if (!settings.voiceExemptRole.some((role) => member.roles.cache.has(role))) {
    const isInValidVoiceChat = settings.workerVoiceChats.some(
      (voiceChatId) => member.voice.channelId === voiceChatId
    );

    if (!isInValidVoiceChat) {
      const voiceChannelString = settings.workerVoiceChats
        .map((id) => `- <#${id}>`)
        .join("\n");
      const voiceChatEmbed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(
          `You need to be in one of the following voice chats:\n${voiceChannelString}`
        );

      return interaction.editReply({ embeds: [voiceChatEmbed] });
    }
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Clock out")
      .setStyle("Danger")
      .setCustomId("clockout_new_button"),
    new ButtonBuilder()
      .setLabel("Break")
      .setStyle("Secondary")
      .setCustomId("break_new_button")
  );

  await handleWorkerEvents("back", worker.userId, workers.guildId);

  await interaction.message.edit({
    components: [buttons],
    files: [await drawClockedin(workers.guildId, interaction.user, workerRole)],
  });

  await interaction.editReply({
    content: "Now you can work again.",
    ephemeral: true,
  });

  //RE-ADD THE DELAYED JOB
  handleAfkSystem(
    clockInData.guildId,
    interaction.user.id,
    interaction.message.id,
    6
  );
}

module.exports = { handleBreakStart, handleBreakEnd };
