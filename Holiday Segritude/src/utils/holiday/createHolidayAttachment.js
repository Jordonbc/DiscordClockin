// Utility function to create attachment from file content
const { AttachmentBuilder } = require("discord.js");

const createHolidayAttachment = async (fileContent, userId) => {
  try {
    if (!fileContent) return null;

    // Convert fileContent to string if it's an object
    const contentStr =
      typeof fileContent === "object"
        ? JSON.stringify(fileContent, null, 2)
        : String(fileContent);

    return new AttachmentBuilder(Buffer.from(contentStr), {
      name: `Holiday-${userId}.txt`,
    });
  } catch (error) {
    console.error("Error creating holiday attachment:", error);
    return null;
  }
};

module.exports = { createHolidayAttachment };
