const { Redis } = require("ioredis");
const dotenv = require("dotenv");
dotenv.config();

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  // password: process.env.REDIS_PASSWORD || null,
};

const redisClient = new Redis(redisOptions);

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

redisClient.on("connect", async () => {
  try {
    const clientId = await redisClient.call("CLIENT", "ID");
    console.log(`✅ Connected to Redis. Client ID: ${clientId}`);
  } catch (error) {
    console.error("❌ Redis authentication failed:", error);
  }
});

module.exports = redisClient;
