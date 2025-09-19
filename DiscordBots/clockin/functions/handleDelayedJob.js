const AfkTimer = require("../models/afkReminders");
const afkQueue = require("../queues/afkQueue");

async function removeDelayedJob(userId, messageId) {
  const TimerId = await AfkTimer.findOne({
    messageId: messageId,
  }).lean();

  const afkEndJob = await afkQueue.getJob(TimerId?.redisJobId);
  if (afkEndJob) {
    // Log detailed information about the Redis job before removing
    console.log("🔍 Redis Job Details:");
    console.log(`- Job ID: ${afkEndJob.id}`);
    console.log(`- Name: ${afkEndJob.name}`);
    console.log(`- Data: ${JSON.stringify(afkEndJob.data)}`);
    console.log(`- Attempts Made: ${afkEndJob.attemptsMade}`);
    console.log(`- Processed On: ${afkEndJob.processedOn}`);
    console.log(`- Finished On: ${afkEndJob.finishedOn}`);
    console.log(`- Timestamp: ${afkEndJob.timestamp}`);

    afkEndJob.remove();
    await AfkTimer.deleteOne({ messageId: messageId });
    console.log(`✅ Afk end job removed for user ${userId}`);
  } else {
    console.log(
      `❌ Afk end job with id: ${TimerId?.redisJobId} not found for message ${messageId}`
    );
  }
}

module.exports = { removeDelayedJob };
