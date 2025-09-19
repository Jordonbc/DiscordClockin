const { Schema, model } = require("mongoose");

const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  hourlySalary: {
    Junior: {
      type: Number,
      default: 0,
      required: true,
    },
    Mid: {
      type: Number,
      required: true,
    },
    Senior: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  category: {
    type: String, //Marketing, Audio, Code, Writing, Design, Art
    required: true,
  },
  id: {
    type: String,
    unique: true,
    required: true,
  },
});

module.exports = model("WorkerRole", roleSchema);
