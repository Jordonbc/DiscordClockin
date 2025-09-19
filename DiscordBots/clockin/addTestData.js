const mongoose = require("mongoose");
const Role = require("./models/roles.js");
const Settings = require("./models/guildSettings.js");

const guildData = {
  guildId: "123456789012345678",
  plan: "Basic", // Could be "Basic", "Pro", or "Elite"
  logChannelId: "987654321098765432",
  weeklyReportChannelId: "876543210987654321",
  targetHours: 40,
  maxAfkHours: 8,
  afkReminders: 2,
  workerVoiceChats: ["123456789101112131"],
  voiceExemptRole: "123456789101112132",
  botAdminRole: "123456789101112133",
  weeklyExemptRole: "123456789101112134",
};

const roleData = {
  guildId: "123456789012345678",
  roles: [
    {
      name: "Developer",
      hourlySalary: {
        Trial: 10.5,
        Junior: 14.0,
        Mid: 18.5,
        Senior: 25.0,
      },
      category: "Tech",
      id: "AB",
    },
  ],
  categorys: ["Tech", "Management"],
  experiences: ["Trial", "Junior", "Mid", "Senior"],
};

async function addTestData() {
  try {
    //connect to the database
    await mongoose.connect(
      "mongodb+srv://admin-uwais:password%40123@cluster0.2ieu9.mongodb.net/?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: "Clockin", // Specify the database name
      }
    );
    await Role.create(roleData);
    await Settings.create(guildData);
  } catch (error) {
    console.error(error);
  }
}

addTestData();
