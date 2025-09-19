const { Schema, model } = require("mongoose");

const messageSchema = new Schema({
  name: {
    type: String,
    required: true,
    //unique: true
  },
  id: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
});

module.exports = model("MessageIds", messageSchema);
