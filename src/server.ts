import fs from 'fs';
import express, { response } from 'express';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

dotenv.config();

const app = express();
const port = 3000;

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

const video_queue = new Queue('video-processing', {connection});

const upload_dir = path.resolve('temp');

if(!fs.existsSync(upload_dir)){
    fs.mkdirSync(upload_dir);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'temp/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({storage});

app.post('/video/upload', upload.single('video'), async (req, res) => {
    if(!req.file) {
        res.status(400).send('Nenhum ficheiro enviado!');
        return;
    }

    const file = req.file as Express.Multer.File;
    const input_path = path.resolve(req.file.path);
    const output_path = path.resolve('outputs', path.basename(file.filename, path.extname(file.filename)));

    try {
        const job = await video_queue.add('video-convert', {
            input: input_path,
            output: output_path
        });

        console.log(input_path);

        res.json({
            message: 'Upload feito com sucesso',
            filename: file.filename,
            path: file.path,
            job: {
                input_path, output_path
            }
        });
    }catch(err) {
        console.error(`ERROR: Add job to queue:`, err);
        res.status(500).json({
            message: 'Error'
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Running server on localhost:${port}`);
});