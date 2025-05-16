import { Server } from "socket.io";

export function createSocketServer(port: number = 3001): Server {
    const io = new Server(port, {
        cors: {
            origin: "*"
        }
    });

    console.log(`Websocket is running on port ${process.env.SOCKET_PORT}`);
    
    io.on("connection", (socket) => {
        console.log("Client connected: ${socket.id}");
    });

    return io;
};