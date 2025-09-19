const Worker = require("../../models/worker.js");
const Clockins = require("../../models/clockins.js");
const GuildSettings = require("../../models/guildSettings");
const Role = require("../../models/roles.js");
const redisPS = require("../../utils/redisPubSubClient");
const {
  handleBreakStart,
  handleBreakEnd,
} = require("../../functions/break/handleBreak");

module.exports = {
  id: "break_new_button",
  run: async (client, interaction) => {
    await interaction.deferReply({ flags: 64 });

    try {
      // Get the clockin message data
      const clockInData = await Clockins.findOne({
        messageId: interaction.message.id,
      });

      if (!clockInData) {
        //delete the clockin message
        await interaction.message.delete();
        throw new Error("Clock-in data not found");
      }

      // Get the worker, settings and roles data
      const [workers, settings, roles] = await Promise.all([
        Worker.findOne({ guildId: clockInData.guildId }),
        GuildSettings.findOne({ guildId: clockInData.guildId }),
        Role.findOne({ guildId: clockInData.guildId }),
      ]);

      // Find the worker from the workers array
      const worker = workers.workers.find(
        (w) => w.userId === interaction.user.id
      );

      if (!worker) throw new Error("Worker not found");

      // Find the worker role
      const workerRole = roles.roles.find((r) => r.id === worker.roleId);

      // Check the worker status
      switch (worker.status) {
        case "Offline":
          return interaction.editReply({
            content: "You are currently offline, start working to go on break.",
            ephemeral: true,
          });

        case "Work":
          await handleBreakStart(interaction, worker, workers, workerRole);
          break;

        case "Break":
          await handleBreakEnd(
            client,
            interaction,
            worker,
            workers,
            settings,
            workerRole,
            clockInData
          );
          break;

        default:
          throw new Error("Invalid worker status");
      }

      // Publish the break event to update embed
      await redisPS.publish(
        "break_event",
        JSON.stringify({
          userId: interaction.user.id,
          guildId: workers.guildId,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      interaction.editReply({
        content: `ERROR:\n\`\`\`${error.message}\`\`\``,
      });
      console.error(`AFK ERROR: ${interaction.user.id}\n`, error);
    }
  },
};
