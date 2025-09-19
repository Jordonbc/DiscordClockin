const { Schema, model, models } = require("mongoose");

const workerSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  workers: [
    {
      userId: {
        type: String,
        required: true,
      },
      clockDates: {
        clockIn: {
          type: [String],
        },
        clockOut: {
          type: [String],
        },
      },
      afkDates: {
        afkIn: {
          type: [String],
        },
        afkOut: {
          type: [String],
        },
      },
      onLeave: {
        start: {
          type: String,
          default: null,
        },
        end: {
          type: String,
          default: null,
        },
      },
      pastHolidays: [
        {
          start: { type: String, required: true },
          end: { type: String, required: true },
          startEpoch: { type: Number, required: true },
          endEpoch: { type: Number, required: true },
        },
      ],
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
        type: String, //Trial, Junior, Mid, Senior
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
        default: 0,
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
    },
  ],
});

module.exports = models.GuildWorkers || model("GuildWorkers", workerSchema);
