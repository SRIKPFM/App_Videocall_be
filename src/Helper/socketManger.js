import { setupGroupChat } from "../routes/groupMessageRouters.js";
import { setupSocketEvents } from "../routes/MessageRouters.js";

export const onlineUsers = new Map();

export function initiateSocketServer(io) {

    setupGroupChat(io, onlineUsers);
    setupSocketEvents(io, onlineUsers);
};