/*
 ------------------------------------------------------------------------------
 ------------------------------------------------------------------------------
 Copyright @ 2024 Segritude LTD.
 All right reserved.
 This code and all related assets are the property of segritude LTD.
 Unauthorized copying, distribution, or modification of this file, 
 via any medium, is strictly prohibited.

 NOTE: Tampering with or removing this notice is prohibited. 
 Any attempt to circumvent this restriction will be subject to legal action.

 ------------------------------------------------------------------------------
 ------------------------------------------------------------------------------
*/

const { Schema, model } = require("mongoose");

const workSessionSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
    },

    userId: {
      type: String,
      required: true,
    },
    clockInTime: {
      type: Date,
      required: true,
    },
    clockOutTime: {
      type: Date,
      required: true,
    },
    clockDates: {
      breaks: [
        {
          breakStart: Date,
          breakEnd: Date,
        },
      ],
    },
    totalWorkedTime: {
      type: String,
      required: true,
    },
    totalBreakTime: {
      type: String,
    },
    totalEarnings: {
      type: Number,
      required: true,
    },
    workDescription: {
      type: String,
      required: true,
    },
    taskHeading: {
      type: String,
      required: true,
    },
    status: {
      type: String,
    },
  },
  { timestamps: true }
);

const WorkSession = model("WorkSession", workSessionSchema);
module.exports = WorkSession;
