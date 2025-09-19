const { Schema, model } = require("mongoose");

const guildSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  logChannelId: {
    type: String,
  },
  weeklyReportChannelId: {
    type: String,
  },
  plan: {
    type: String, //Basic, Pro, Elite
  },
  timeZone: {
    type: String,
  },
  targetHours: {
    type: Number,
  },
  maxAfkHours: {
    type: Number,
  },
  afkReminders: {
    type: Number,
  },
  workerVoiceChats: [
    {
      type: String,
    },
  ],
  voiceExemptRole: [
    {
      type: String,
    },
  ],
  botAdminRole: [
    {
      type: String,
    },
  ],
  weeklyExemptRole: {
    type: String,
  },
});

module.exports = model("GuildSettings", guildSchema);
