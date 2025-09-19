const { Queue } = require("bullmq");
const redisClient = require("../utils/redisClient");

const afkQueue = new Queue("afkQueue", {
  connection: redisClient,
});

module.exports = afkQueue;
