const { Schema, model } = require('mongoose');

const messageSchema = new Schema({
  userId: String,
  guildId: String,
  timerEnd: Date,
});

module.exports = model("afkPresences", messageSchema);