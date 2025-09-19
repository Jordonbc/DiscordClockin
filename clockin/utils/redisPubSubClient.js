const { Redis } = require("ioredis");
const dotenv = require("dotenv");
dotenv.config();

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
};

const redisPubSub = new Redis(redisOptions);

redisPubSub.on("error", (err) => {
  console.error("Redis error:", err);
});

redisPubSub.on("connect", () => {
  console.log("✅ Connected to Redis:", redisOptions);
});

redisPubSub.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

module.exports = redisPubSub;
