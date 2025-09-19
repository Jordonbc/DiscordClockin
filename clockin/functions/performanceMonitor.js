const cron = require("cron");
const v8 = require("v8");

const performanceMonitor = new cron.CronJob("*/1 * * * *", () => {
  const memoryUsage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();

  console.log("Discord Bot Performance Metrics:");
  console.log(
    `RSS Memory Usage: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `External Memory: ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `Heap Limit: ${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`
  );
});

module.exports = performanceMonitor;
