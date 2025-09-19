const redisPS = require("../../utils/redis/redisPubSub");
const updateClockInMessage = require("../../utils/updateClockinMessage");

module.exports = async (client) => {
  try {
    redisPS.subscribe("clockin_event", (err) => {
      if (err) console.error("❌ Failed to subscribe:", err);
      else console.log("📡 Subscribed to clockin_event");
    });

    redisPS.subscribe("clockout_event", (err) => {
      if (err) console.error("❌ Failed to subscribe:", err);
      else console.log("📡 Subscribed to clockout_event");
    });

    redisPS.subscribe("break_event", (err) => {
      if (err) console.error("❌ Failed to subscribe:", err);
      else console.log("📡 Subscribed to break_event");
    });

    redisPS.subscribe("voice_event", (err) => {
      if (err) console.error("❌ Failed to subscribe:", err);
      else console.log("📡 Subscribed to voice_event");
    });

    redisPS.on("message", async (channel, message) => {
      if (
        channel === "clockin_event" ||
        channel === "clockout_event" ||
        channel === "break_event" ||
        channel === "voice_event"
      ) {
        console.log("📡 Received event:", channel);
        const { userId, guildId } = JSON.parse(message);
        await updateClockInMessage(client, guildId);
      }
    });
  } catch (error) {
    console.error("❌ Failed to setup Redis listener:", error);
  }
};
