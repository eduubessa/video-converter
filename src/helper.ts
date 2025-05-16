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
            console.log('[ffprobe CLOSE] code:', code);
            console.log('[ffprobe OUTPUT]', output);
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
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-select-streams', 'v:0',
            '-show-entries', 'stream=width,height',
            '-of', 'json',
            input_path
        ]);

        let output = '';

        ffprobe.stdout.on('data', (code) => {
            console.log(code.toString());
            if(code === 0){
                try {
                    const json = JSON.parse(output);
                    const { width, height } = json.streams[0];
                    resolve({width, height});
                }catch(err) {
                    console.log(`Cannot watch resolution with ffprobe.`);
                    reject(new Error(`Error: cannot watch resolution with ffprobe`));
                }
            }else{
                reject(new Error(`FFPROBE failed get a resolutation`));
            }
        });

        ffprobe.on('close', (code) => {
            if(code === 0){
                try {
                    const data = JSON.parse(output);
                    const { width, height } = data.streams[0];
                    resolve({ width, height });
                }catch(err){
                    reject(new Error(`Error on JSON FFPROBE`));
                }
            }else{
                reject(new Error(`FFPROBE faild! Error code ${code}`));
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