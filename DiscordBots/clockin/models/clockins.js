const { Schema, model } = require('mongoose');

const messageSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  messageId: {
    type: String, 
    required: true
  },
  guildId: {
    type: String,
    required: true
  }
});

module.exports = model("ClockIns", messageSchema);