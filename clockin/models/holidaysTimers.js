const { Schema, model } = require("mongoose");

const messageSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  redisJobId: String,
  status: { type: String, default: "scheduled" }, // scheduled, complete, failed
});

module.exports = model("HolidaysTimers", messageSchema);
