const { EmbedBuilder } = require("discord.js");

function buildWorkerEmbed(user, worker, { title, description } = {}) {
  const experienceText = worker.experience ? worker.experience : "Not set";
  const embed = new EmbedBuilder()
    .setTitle(title || "Worker registered")
    .setDescription(description || `${user} is ready to start working!`)
    .addFields(
      { name: "Role", value: worker.role_id, inline: true },
      { name: "Experience", value: experienceText, inline: true },
      { name: "Status", value: worker.status, inline: true }
    )
    .setTimestamp(new Date());

  return embed;
}

function buildAlreadyRegisteredEmbed(user, worker) {
  return buildWorkerEmbed(user, worker, {
    title: "Worker already registered",
    description: `${user} is already registered in the system.`,
  });
}

module.exports = {
  buildWorkerEmbed,
  buildAlreadyRegisteredEmbed,
};
