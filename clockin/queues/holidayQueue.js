const { Queue } = require("bullmq");
const redisClient = require("../utils/redisClient");

const holidayQueue = new Queue("holidayQueue", {
  connection: redisClient,
});

module.exports = holidayQueue;
