import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
import IORedis from 'ioredis';
import { createSocketServer } from './socket';
import { createWorker } from './worker';
import './server';

dotenv.config();

console.log(`Application running on ${os.platform()}`);

const redis = new IORedis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null
});

const IO = createSocketServer(Number(process.env.SOCKET_PORT));

const cpus_total = os.cpus().length;
const workers_count = Math.max(1, Math.floor(cpus_total * 0.5));
const currency_per_worker = 2;

for(let i = 0; i < workers_count; i++)
{
    createWorker(redis, IO, currency_per_worker);
}