const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  codeBlock,
} = require("discord.js");
require("dotenv").config();
const mongoose = require("mongoose");

const token = process.env.TOKEN;
const mongoURL = process.env.MONGO_URL;

const client = new Client({
  intents: [
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
});

const fs = require("fs");

(async () => {
  try {
    client.commands = new Collection();
    client.aliases = new Collection();
    client.slashCommands = new Collection();
    client.buttons = new Collection();
    client.modals = new Collection();
    client.selectMenus = new Collection();
    client.contextMenus = new Collection();
    client.allCommands = new Array();
    client.prefix = process.env.PREFIX;

    module.exports = client;

    fs.readdirSync("./handlers").forEach((handler) => {
      require(`./handlers/${handler}`)(client);
    });

    mongoose
      .connect(mongoURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: "Clockin", // Specify the database name
      })
      .then(() => console.log("Successfully connected to MongoDB!"))
      .catch((err) => console.error("MongoDB connection error:", err));

    client.login(token);
  } catch (error) {
    console.log(error);
  }
})();
