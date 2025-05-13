import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import cron from 'node-cron';
import { Server } from 'socket.io';
import { initiateApp } from './src/Helper/apiHelper.js';
import { initiateSocketServer } from './src/Helper/socketManger.js';
import { onlineUsers } from './src/Helper/socketManger.js';
import { MessageSchema } from './src/models/MessageModels.js';
import { TodolistSchema } from './src/models/todolistModels.js';
dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(bodyParser.urlencoded({extends: true}));
app.use(bodyParser.urlencoded({extended: false}));

mongoose.connect(process.env.MONGODBURI)
.then(() => console.log("Database connected successfully.."))
.catch((error) => console.log("Database not connected successfully.."));

initiateApp(app);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

initiateSocketServer(io);

cron.schedule('* * * * *', async () => {
    console.log("⏰ Checking for due reminders...");

    const today = new Date();
    const dueRemainders = await TodolistSchema.find({
        alarm: { $lte:  today },
        status: 'Upcoming'
    });

    for (const remainder of dueRemainders) {
        const senderId = remainder.userId;
        const receiverId = remainder.targetedUserId;

        const remainderMessage = new MessageSchema({ 
            messageId: uuidv4(),
            senderId: senderId,
            receiverId: receiverId,
            content: {
                text: remainder.text || "You have a remainder..!!",
                imageUrl: null,
                videoUrl: null,
                audioUrl: null,
                location: null,
                documentUrl: null
            },
            isPined: false,
            isMessageDelivered: onlineUsers.has(receiverId) ? 'delivered' : 'sent',
            isMessageReaded: false
        });

        await remainderMessage.save();

    if (onlineUsers.has(receiverId)) {
        const receiverSocketId = onlineUsers.get(receiverId);
        io.to(receiverSocketId).emit('newMessage', remainderMessage);
        console.log(`✅ Sent reminder to ${receiverId}: ${remainderMessage.content.text}`)
    } else {
        console.log(`⚠️ User ${receiverId} is offline. Saved reminder message.`);
    }
    }
});

app.listen(port, () => {
    console.log(`Server successfully running on port ${port}`);
});