import { io } from "socket.io-client";

let socket;

const getSocket = () => {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_SOCKET_URL)
    }
    return socket;
}

const setSocket = () => {
    socket = null;
}

export default {
    getSocket, setSocket
}