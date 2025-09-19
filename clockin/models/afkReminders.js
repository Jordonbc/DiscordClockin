const { Schema, model } = require("mongoose");

const messageSchema = new Schema({
  messageId: String,
  endTime: Date,
  redisJobId: String,
  status: { type: String, default: "scheduled" }, // scheduled, complete, failed
});

module.exports = model("afkReminders", messageSchema);
