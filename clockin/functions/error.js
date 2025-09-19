//functions\error.js
const { codeBlock } = require("@discordjs/builders");
require("dotenv").config();

const guildId = process.env.GUILD_ID;
const errorLogChannelId = process.env.ERROR_LOG_CHANNEL_ID;

async function sendError(client, error, user) {
  try {
    console.log("Error handler called:");

    // Validate required parameters
    if (!client) throw new Error("Client is required");
    if (!error) throw new Error("Error object is required");
    if (!user) throw new Error("User is required");

    console.log("Error handler called:", {
      errorMessage: error.message,
      errorStack: error.stack,
      userId: user.id,
    });

    // Constants for guild and channel IDs
    const GUILD_ID = guildId;
    const ERROR_FORUM_ID = errorLogChannelId;

    // Fetch guild
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      console.error(`Failed to find guild with ID ${GUILD_ID}`);
      return;
    }

    // Fetch error forum channel
    const errorForum = guild.channels.cache.get(ERROR_FORUM_ID);
    if (!errorForum) {
      console.error(`Failed to find forum channel with ID ${ERROR_FORUM_ID}`);
      return;
    }

    // Generate error code for reference
    const errorCode = generateErrorCode();

    // Create a descriptive thread title
    const threadTitle = `[${errorCode}] ${error.message.slice(0, 50)}${
      error.message.length > 50 ? "..." : ""
    }`;

    // Create the thread
    const thread = await errorForum.threads.create({
      name: threadTitle,
      autoArchiveDuration: 1440, // Archive after 24 hours
    });

    // Send a message in the thread with error information
    await thread.send({
      content: [
        `**Error Code:** \`${errorCode}\``,
        "",
        "**Error Details:**",
        codeBlock("js", error.stack || error.message),
        "",
        "**Context Information:**",
        "```",
        `Triggered by: ${user.tag} (${user.id})`,
        `Timestamp: ${new Date().toISOString()}`,
        `Guild ID: ${guild.id}`,
        "```",
        "",
        "Please investigate and update this thread with findings and resolution status.",
      ].join("\n"),
    });

    // Optionally pin the thread if it's a critical error
    // await post.pin();

    return thread;
  } catch (handlerError) {
    // Log any errors that occur within the error handler itself
    console.error("Error in sendError handler:", handlerError);

    // Attempt to log to console if everything else fails
    console.error("Original error:", error);
    console.error("Triggered by user:", user?.tag);
  }
}

function generateErrorCode() {
  const timestamp = new Date().getTime().toString(36).slice(-6);
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ERR_${timestamp}${random}`;
}

module.exports = {
  sendError,
  generateErrorCode,
};
