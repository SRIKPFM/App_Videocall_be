import express from 'express';
import multer from 'multer';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { bucket } from '../Helper/fcm.js';
import { MessageSchema } from '../models/MessageModels.js';
import { UserLoginCredentials } from '../models/loginModels.js';
import { TodolistSchema } from '../models/todolistModels.js';
import { authendicate } from '../middleware/middleware.js';
import { getUserIdFromToken } from '../Helper/helper.js';
import { ContactDetails } from '../models/contactsModels.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

export function setupSocketEvents(io, onlineUsers) {
    io.on('connection', (socket) => {
        console.log("User connected => " + socket.id);

        socket.on('userOnline', async (userId) => {
            onlineUsers.set(userId, socket.id);
            console.log(`User ${userId} is online.`);

            const pendingMessages = await MessageSchema.find({ receiverId: userId, isMessageDelivered: 'sent' });

            pendingMessages.forEach(async (msg) => {
                socket.emit('newMessage', msg);

                await MessageSchema.updateOne({ messageId: msg.messageId }, { status: 'delivered' });
            });
        })

        socket.on("send_message", async (data) => {
            const { senderId, receiverId, text, imageUrl, videoUrl, audioUrl, documentUrl, location, contact } = data;
            const messageId = uuidv4();
            const newMessage = new MessageSchema({
                messageId: messageId,
                senderId: senderId,
                receiverId: receiverId,
                content: {
                    text: text ? text : null,
                    imageUrl: imageUrl ? imageUrl : null,
                    videoUrl: videoUrl ? videoUrl : null,
                    audioUrl: audioUrl ? audioUrl : null,
                    documentUrl: documentUrl ? documentUrl : null,
                    location: location ? location : null,
                    contact: contact ? contact : null
                },
                status: onlineUsers.has(receiverId) ? 'delivered' : 'sent'
            });

            await newMessage.save();

            if (onlineUsers.has(receiverId)) {
                io.to(onlineUsers.get(receiverId)).emit('newMessage', newMessage);
            }

            io.to(socket.id).emit('messageStatus', { messageId, status: newMessage.status });
        });

        socket.on('messagesRead', async ({ userId, chatWithUserId }) => {
            const updated = await MessageSchema.updateMany(
                { senderId: chatWithUserId, receiverId: userId, status: { $in: ['sent', 'delivered'] } },
                { status: 'read', isMessageReaded: true }
            );

            const senderSocketId = onlineUsers.get(chatWithUserId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('messageReadNotification', { from: userId })
            }
        })

        socket.on("disconnect", () => {
            for (const [userId, socketId] of Object.entries(onlineUsers)) {
                if (socketId === socket.id) {
                    delete onlineUsers[userId];
                    break;
                }
            }
        });

        console.log("User disconnected => " + socket.id);
    });

};

router.post('/api/storeMessages', authendicate, async (req, res) => {
    try {
        const { receiverId, text, imageUrl, videoUrl, audioUrl, documentUrl, contact } = req.body;
        const token = req.header('Authorization');
        const senderId = await getUserIdFromToken(token);
        const isUserExcist = await UserLoginCredentials.findOne({ userId: senderId });
        if (!isUserExcist) { return res.status(404).json({ success: fasle, error: "User not found..!!" }) };
        if (!senderId || !receiverId) { return res.status(400).json({ success: false, error: "senderId or receiverId is required..!!" }) };
        const createMessage = {
            messageId: uuidv4(),
            senderId: senderId,
            receiverId: receiverId,
            content: {
                text: text ? text : null,
                imageUrl: imageUrl ? imageUrl : null,
                videoUrl: videoUrl ? videoUrl : null,
                audioUrl: audioUrl ? audioUrl : null,
                documentUrl: documentUrl ? documentUrl : null,
                contact: contact ? contact : null
            },
            isPined: false
        };
        const storeMessages = await MessageSchema.create(createMessage)
            .then((data) => { return res.status(200).json({ success: true, message: "Message stored successfully..", data: data }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getMessages', authendicate, async (req, res) => {
    try {
        const { receiverId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const getMessages = await MessageSchema.find({
            $or: [
                { senderId: userId, receiverId },
                { senderId: receiverId, receiverId: userId }
            ]
        },
            {
                __v: 0,
                _id: 0
            }).sort("timeStamp")
            .then((messages) => { return res.status(200).json({ success: true, data: messages }) })
            .catch((error) => { return res.status(404).json({ success: false, error: "Can't find any messages." }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/updateMessage', authendicate, async (req, res) => {
    try {
        const { messageId } = req.body;
        const findMessage = await MessageSchema.findOne({ messageId: messageId });
        if (!findMessage) { return res.status(404).json({ success: false, error: "Can't find message." }) }
        const updateMessage = await MessageSchema.updateOne({ messageId: messageId }, { $set: req.body }, { new: true })
            .then(async () => {
                const finalData = await MessageSchema.findOne({ messageId: messageId }, { __v: 0, _id: 0 });
                return res.status(200).json({ success: true, message: "Message updated successfully..", data: finalData });
            })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/pinMessages', authendicate, async (req, res) => {
    try {

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/deleteMessage', authendicate, async (req, res) => {
    try {
        const { messageId } = req.body;
        const deleteMessage = await MessageSchema.findOneAndDelete({ messageId: messageId })
            .then(() => { return res.status(200).json({ success: true, message: "Message deleted successfully..!!" }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/recentChats', authendicate, async (req, res) => {
    try {
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const recentChats = await MessageSchema.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: userId },
                        { receiverId: userId }
                    ]
                }
            },
            {
                $sort: { 'content.timeStamp': -1 }
            },
            {
                $addFields: {
                    lastMessage: {
                        $cond: [
                            { $ifNull: ["$content.text", false] }, "$content.text",
                            {
                                $cond: [
                                    { $ifNull: ["$content.imageUrl", false] }, "[Photo]",
                                    {
                                        $cond: [
                                            { $ifNull: ["$content.videoUrl", false] }, "[Video]",
                                            {
                                                $cond: [
                                                    { $ifNull: ["$content.audioUrl", false] }, "[Audio]",
                                                    {
                                                        $cond: [
                                                            { $ifNull: ["$content.documentUrl", false] }, "[Document]",
                                                            "[Unknown]"
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$senderId", userId] },
                            "$receiverId",
                            "$senderId"
                        ]
                    },
                    lastMessage: { $first: "$lastMessage" },
                    timeStamp: { $first: "$content.timeStamp" },
                    unreadCount: {
                        $sum: {
                            $cond: [

                                { $and: [{ $eq: ["$receiverId", userId] }, { $eq: ["$isMessageReaded", false] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $sort: { timeStamp: -1 }
            }
        ])

        return res.json({ success: true, messages: recentChats });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/uploadFiles', authendicate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ success: false, error: "File not uploaded." }) }
        const file = req.file;
        const blob = bucket.file(Date.now() + '_' + file.originalname);

        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });

        blobStream.on("error", (error) => {
            console.error(error);
            return res.status(500).json({ success: false, error: error, message: "Upload error" });
        });

        blobStream.on("finish", async () => {
            await blob.makePublic();

            const publicURL = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            return res.status(200).json({ success: true, Url: publicURL });
        });

        blobStream.end(file.buffer);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/unreadCount/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const unreadCounts = await MessageSchema.aggregate([
            { $match: { receiverId: userId, isMessageReaded: false } },
            {
                $group: {
                    _id: "senderId",
                    count: { $sum: 1 }
                }
            }
        ]);
        if (!unreadCounts) {
            return res.status(404).json({ success: false, error: "Can't get or There is no unread message." });
        }
        return res.status(200).json({ success: true, unreadCounts });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/chat/delete-for-me', authendicate, async (req, res) => {
    try {
        const { messageId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const deleteMessage = await MessageSchema.updateOne({
            $or: [
                { senderId : userId },
                { receiverId: userId }
            ], messageId: messageId
        }, { $addToSet: { deleteFor: userId } });
        if (!deleteMessage) {
            return res.status(400).json({ success: false, error: "Error occurred while deleting message" });
        }
        return res.status(200).json({ success: true, message: "Message deleted successfully..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
});

router.post('/api/chat/deleteForEveryone', authendicate, async (req, res) => {
    try {
        const { messageId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const findMessage = await MessageSchema.findOne({ messageId: messageId });
        if (!findMessage) { return res.status(404).json({ success: false, error: "Can't find message..!!" }) }
        if (findMessage.senderId !== userId) { return res.status(400).json({ success: false, error: "You're not authorized to delete this message..!!" }) }

        const deleteMessage = await MessageSchema.updateOne({ messageId: messageId, senderId: userId }, { isDeleteForEveryone: true });
        if (!deleteMessage) {
            return res.status(400).json({ success: false, error: "Error occurred while deleting message" });
        }
        return res.status(200).json({ success: true, message: "Message deleted successfully..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// router.post('/api/updateMessageDeveliryStatus', async (req, res) => {
//     try {
//         const { userId, messageId } = req.body;
//         const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
//         if (!isUserExcist) { return res.status(404).json({ success: false, error: "User not found..!!" })};
//         if (isUserExcist.status === true) {
//             const updateAllMessages = await MessageSchema.updateMany({ messageId: { $in: messageId }}, { $set: { isMessageDelivered: true }});
//             if (!updateAllMessages) {
//                 return res.status(400).json({ success: false, error: "Error occurred while updating message status..!!" });
//             }
//             return res.status(200).json({ success: true, message: "Message updated successfully..!!" });
//         } else {
//             return res.status(400).json({ success: false, error: "User not in online..!!" });
//         }
//     } catch (error) {
//         return res.status(500).json({ success: fasle, error: error.message });
//     }
// });

export default router;