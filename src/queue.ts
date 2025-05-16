import { Queue } from "bullmq";
import dotenv from "dotenv";
import IORedis, { Redis } from 'ioredis';

dotenv.config();

const connection = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379
});

export const queue = new Queue("video-processing", {
    connection
});