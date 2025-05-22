import fs from 'fs';
import path from 'path';
import { Resolution } from "./types";
import { spawn } from 'child_process';
import { ffprobe } from 'fluent-ffmpeg';

export function getDuration(input: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const input_path = path.resolve(input);

        if (!fs.existsSync(input)) {
            return reject(new Error(`Error: File not found: ${input}`));
        }

        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            input_path
        ]);

        let output = '';

        ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code === 0) {
                resolve(parseFloat(output));
            } else {
                reject(new Error('ffprobe failed to get duration!'));
            }
        });
    });
}

export function getResolution(input: string): Promise<Resolution>
{
    return new Promise((resolve, reject) => {
        const input_path = path.resolve(input);

        if (!fs.existsSync(input)) {
            return reject(new Error(`Error: File not found: ${input}`));
        }

        console.log(input_path);

        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'stream=width,height',
            '-of', 'json',
            input_path
        ]);

        let output = '';

         ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code === 0) {
                let resolution = JSON.parse(output);
                resolve({
                    width: resolution.streams[1].width,
                    height: resolution.streams[1].height
                });
            } else {
                //reject(new Error('ffprobe failed to get resolution!'));
                console.log("Error: Get Resolution", output);
                reject(code);
            }
        })
    });
}

export function parseTimeToSeconds(time_str: string): number {
    const parts = time_str.split(':');
    if (parts.length === 3) {
        const [hh, mm, ss] = parts;
        return (parseInt(hh) * 3600) + (parseInt(mm) * 60) + parseFloat(ss);
    }

    return 0;
}