const { EmbedBuilder } = require("discord.js");

/**
 * Check if the worker is already working or on break.
 */
async function checkIfWorkingOrOnBreak(worker, interaction, clockins, workers) {
  if (worker.status === "Work" || worker.status === "Break") {
    try {
      // Check if the worker has an existing clock-in message
      const clockinMsg = await clockins.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      if (clockinMsg) {
        const userchat = await interaction.member.createDM();
        const clockInMsgDC = await userchat.messages
          .fetch(clockinMsg.messageId)
          .catch(() => null);

        if (clockInMsgDC) {
          const statusMsg =
            worker.status === "Work"
              ? "You are already working. If you would like to check out, please go to this"
              : "You are currently on break. If you would like to check out or go to work, please go to this";

          await interaction.editReply({
            content: `${statusMsg} [message](<${clockInMsgDC.url}>).`,
            ephemeral: true,
          });
          return false; // Stop further execution
        }
      }

      // If message not found, reset worker status and return error message
      worker.status = "Offline";
      worker.clockDates?.clockIn.length > worker.clockDates?.clockOut.length
        ? worker.clockDates.clockOut.push(new Date())
        : null;
      await workers.save();
      await interaction.editReply({
        content:
          "Could not find your existing clock-in message. Please try clocking in again.",
        ephemeral: true,
      });
      return false; // Stop further execution
    } catch (error) {
      console.error("Error handling existing clock-in:", error);
      await interaction.editReply({
        content:
          "An error occurred while checking your status. Please try again.",
        ephemeral: true,
      });
      return false; // Stop further execution
    }
  }

  return true; // Proceed if not working or on break
}

/**
 * Ensure the worker is offline before clocking in.
 */
async function checkIfOffline(worker, interaction) {
  if (worker.status !== "Offline") {
    await interaction.editReply({
      content:
        "You are already clocked in or on break. Please check your status.",
      ephemeral: true,
    });
    return false; // Stop further execution
  }

  return true; // Proceed if offline
}

module.exports = { checkIfWorkingOrOnBreak, checkIfOffline };
