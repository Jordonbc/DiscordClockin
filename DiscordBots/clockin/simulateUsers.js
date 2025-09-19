const client = require(".");
const { performance } = require("perf_hooks");

async function simulateButtonClick(userId, guildId) {
  try {
    console.log(
      `Simulating button click for user: ${userId} in guild: ${guildId}`
    );

    const startTime = performance.now();
    const initialMemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    // Fetch the guild
    const guild = await client.guilds.fetch(guildId);

    // Mock interaction
    const interaction = {
      user: { id: userId },
      message: { id: "1334071657719136309" }, // replace if your code expects specific message IDs
      reply: async ({ content }) => console.log(`[Reply] ${content}`),
      editReply: async ({ content }) => console.log(`[Edit Reply] ${content}`),
      deferReply: async () => console.log("Reply deferred"),
      guildId: guildId,
    };

    const buttonHandler = require("./buttons/clockin/break");
    await buttonHandler.run(client, interaction);

    const endTime = performance.now();
    const finalMemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(
      `Simulation for user ${userId} completed in ${(
        endTime - startTime
      ).toFixed(2)} ms`
    );
    console.log(
      `Memory usage: ${(finalMemoryUsage - initialMemoryUsage).toFixed(2)} MB`
    );
  } catch (error) {
    console.error(`Error simulating button click: ${error.message}`);
  }
}

async function simulateMultipleUserClicks() {
  const userSimulations = [];
  const testUserId = "513367671019143171";
  const testGuildId = "1333113415522062427";

  const startOverallTime = performance.now();
  const initialMemory = process.memoryUsage().rss / 1024 / 1024;

  for (let i = 1; i <= 150; i++) {
    userSimulations.push(simulateButtonClick(testUserId, testGuildId));
  }

  await Promise.all(userSimulations);

  const endOverallTime = performance.now();
  const finalMemory = process.memoryUsage().rss / 1024 / 1024;

  console.log("All user interactions simulated.");
  console.log(
    `Total execution time: ${(endOverallTime - startOverallTime).toFixed(2)} ms`
  );
  console.log(
    `Peak memory usage: ${(finalMemory - initialMemory).toFixed(2)} MB`
  );
}

simulateMultipleUserClicks();
