const { Schema, model } = require("mongoose");

const roleSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  roles: [
    {
      name: {
        type: String,
        required: true,
      },
      hourlySalary: {
        type: Map,
        of: Number,
      },
      category: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
      experiences: {
        type: [String],
      },
    },
  ],
  categorys: {
    type: [String],
  },
  experiences: {
    type: [String],
    default: ["Junior", "Mid", "Senior"],
  },
});

module.exports = model("Roles", roleSchema);
