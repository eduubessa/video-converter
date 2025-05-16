import { Server } from 'socket.io';

export interface ConvertOptions {
    input: string,
    output: string,
    socket: Server,
    job_id: string
};
export interface Resolution {
    width: number;
    height: number;
};