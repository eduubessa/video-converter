import { JobData, Worker } from "bullmq";
import { Redis } from "ioredis";
import convert from "./convert";
import { Server } from "socket.io";

interface JobProp {
    input: string,
    output: string
};

export function createWorker(connection: Redis, socket: Server, concurrency: number = 1): Worker {
    const worker = new Worker<JobProp>('video-processing', async (job) => {
        const { input, output } = job.data;
        await convert({ input, output, socket, job_id: job.id!.toString() });
        console.log(`Job ID: ${job.id} processing...`);

    },  { connection, concurrency});

    worker.on('progress', (job, progress) => {
        console.log(`Job ID: ${job.id}, ${progress}% completed!,`)
    });

    worker.on('completed', (job) => {
        console.log(`Job ID: ${job.id} completed!`);
    })

    worker.on('failed', (job, err) => {
        console.log(`Job ID: ${job?.id} failed!`, err.message);
    });

    return worker;
}