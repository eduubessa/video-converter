import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ConvertOptions } from './types';
import { getDuration, getResolution, parseTimeToSeconds } from './helper';

export default async function convert({ input, output, socket, job_id }: ConvertOptions): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        try {
            if (!fs.existsSync(output)) {
                fs.mkdirSync(output, { recursive: true });
            }

            const duration = await getDuration(input);
            if (duration < 1) {
                throw new Error('Vídeo muito curto para conversão.');
            }

            // TODO: Get original resolution per file
           //const original_res = await getResolution(input);

            const resolutions = [
                { name: '8k', width: 7680, height: 4320, bitrate: '14000k' },
                { name: '4k', width: 3840, height: 2160, bitrate: '8000k' },
                { name: '1440p', width: 2560, height: 1440, bitrate: '5000k' },
                { name: '1080p', width: 1920, height: 1080, bitrate: '3000k' },
                { name: '720p', width: 1280, height: 720, bitrate: '2000k' },
                { name: '480p', width: 854, height: 480, bitrate: '1000k' },
                { name: '360p', width: 640, height: 360, bitrate: '700k' },
                { name: '240p', width: 426, height: 240, bitrate: '500k' },
                { name: '144p', width: 256, height: 144, bitrate: '300k' },
            ];

            // TODO: Filter resolutions from original resolution file

            /*
            const resolutions_filtered = resolutions.filter(res => {
                return res.width <= original_res.width && res.height <= original_res.height;
            });
            */

            const variant_streams: string[] = [];

            for (const res of resolutions) {
                console.log(res);

                const output_per_res = path.join(output, res.name);
                const output_file = path.join(output_per_res, `master.m3u8`);

                if (!fs.existsSync(output_per_res)) {
                    fs.mkdirSync(output_per_res);
                }

                variant_streams.push(
                    `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.bitrate) * 1080},RESOLUTION=${res.width}x${res.height}\n${res.name}.m3u8`
                );

                await new Promise<void>((resolveVariant, rejectVariant) => {
                    const ffmpeg_args = [
                        '-y', '-i', input,
                        '-vf', `scale=w=${res.width}:h=${res.height}`,
                        '-c:a', 'aac',
                        '-ar', '48000',
                        '-c:v', 'libx264',
                        '-profile:v', 'main',
                        '-crf', '20',
                        '-sc_threshold', '0',
                        '-g', '48',
                        '-keyint_min', '48',
                        '-b:v', res.bitrate,
                        '-maxrate', res.bitrate,
                        '-bufsize', '12000k',
                        '-hls_time', '4',
                        '-hls_playlist_type', 'vod',
                        '-f', 'hls',
                        output_file
                    ];

                    const ffmpeg = spawn('ffmpeg', ffmpeg_args);

                    let ffmpegErrorOutput = '';
                    let lastEmit = Date.now();

                    ffmpeg.stderr.on('data', (data) => {
                        const line = data.toString();
                        ffmpegErrorOutput += line;
                        const match = line.match(/time=(\d+:\d+:\d+\.\d+)/);
                        if (match) {
                            const current_time = parseTimeToSeconds(match[1]);
                            const percent = Math.min(100, (current_time / duration) * 100);
                            socket.emit(`ffmpeg-current`, {
                                job_id,
                                resolution: {
                                    name: res.name,
                                    width: res.width,
                                    height: res.height,
                                    bitrate: res.bitrate
                                },
                                completed: percent
                            });
                            lastEmit = Date.now();
                            console.log(`[${res.name}] Progress: ${percent.toFixed(2)}%`);
                        } else if (Date.now() - lastEmit > 3000) {
                            // Emit keepalive para evitar job stalled
                            socket.emit(`ffmpeg-keepalive`, { job_id, resolution: res.name });
                            lastEmit = Date.now();
                        }
                    });

                    ffmpeg.on('close', (code) => {
                        if (code === 0) {
                            resolveVariant();
                        } else {
                            rejectVariant(new Error(`FFMPEG exited with code ${code} for resolution ${res.name}. Output:\n${ffmpegErrorOutput}`));
                        }
                    });
                });
            }

            const master_path = path.join(output, 'master.m3u8');
            fs.writeFileSync(master_path, `#EXTM3U\n${variant_streams.join('\n')}`);

            socket.emit('ffmpeg-completed', {
                job_id,
                file_master: 'master.m3u8'
            });

            resolve();
        } catch (err) {
            console.error(err);
            socket.emit('ffmpeg-error', {
                job_id,
                message: (err as Error).message
            });
            reject(err);
        } finally {
            // Apagar ficheiro original sempre, evita deixar lixo
            if (fs.existsSync(input)) {
                try {
                    fs.unlinkSync(input);
                } catch (e) {
                    console.warn(`Erro ao apagar ficheiro original: ${input}`, e);
                }
            }
        }
    });
}