const { Schema, model } = require("mongoose");

const workerSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  clockDates: {
    clockIn: {
      type: [String],
    },
    clockOut: {
      type: [String],
    },
  },
  onLeave: {
    start: {
      type: String,
    },
    end: {
      type: String,
    },
  },
  clockInMessage: {
    type: String,
  },
  afkMessage: {
    type: String,
  },
  status: {
    type: String, //Work, Break, Offline
    required: true,
  },
  experience: {
    type: String, //Junior, Mid, Senior
  },
  roleId: {
    type: String,
    required: true,
  },
  breaksCount: {
    type: Number,
    default: 0,
  },
  worked: {
    type: Number,
  },
  breakTime: {
    type: Number,
  },
  dailyWorked: {
    type: Number,
    required: true,
  },
  weeklyWorked: {
    type: Number,
    required: true,
  },
  totalWorked: {
    type: Number,
    required: true,
  },
});

module.exports = model("Worker", workerSchema);
