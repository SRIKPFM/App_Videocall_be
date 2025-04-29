import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { bucket } from '../Helper/fcm.js';
import { MessageSchema } from '../models/MessageModels.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({storage});

let onlineUsers = {};

export function setupSocketEvents(io) {
    io.on('connection', (socket) => {
        console.log("User connected => " + socket.id);
    
        socket.on("add_user", (userId) => {
            onlineUsers[userId] = socket.id
        });
    
        socket.on("send_message", (data) => {
            console.log("Message received to send:", data);  // Log incoming data
            const receiverSocket = onlineUsers[data.receiverId];
            if (receiverSocket) {
                io.to(receiverSocket).emit("received_message", data);
            }
        });
    
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

router.post('/api/storeMessages', async (req, res) => {
    try {
        const { senderId, receiverId, text, imageUrl, videoUrl, documentUrl } = req.body;
        if (!senderId || !receiverId) { return res.status(400).json({ success: false, error: "senderId or receiverId is required..!!" })};
        const createMessage = {
            messageId: uuidv4(),
            senderId: senderId,
            receiverId: receiverId,
            content: {
                text: text ? text : null,
                imageUrl: imageUrl ? imageUrl : null,
                videoUrl: videoUrl ? videoUrl : null,
                documentUrl: documentUrl ? documentUrl : null
            },
            isPined: false
        };
        const storeMessages = await MessageSchema.create(createMessage)
        .then((data) => { return res.status(200).json({ success: true, message: "Message stored successfully..", data: data })})
        .catch((error) => { return res.status(400).json({ success: false, error: error})});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getMessages', async (req, res) => {
    try {
        const { userId, receiverId } = req.body;
        const getMessages = await MessageSchema.find({
            $or: [
                { senderId: userId, receiverId},
                { senderId: receiverId, receiverId: userId }
            ]
        },
        {
            __v:0,
            _id:0
        }).sort("timeStamp")
        .then((messages) => { return res.status(200).json({ success: true, data: messages })})
        .catch((error) => { return res.status(404).json({ success: false, error: "Can't find any messages." })});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/updateMessage', async (req, res) => {
    try {
        const { messageId } = req.body;
        const findMessage = await MessageSchema.findOne({ messageId: messageId });
        if (!findMessage) { return res.status(404).json({ success: false, error: "Can't find message." })}
        const updateMessage = await MessageSchema.updateOne({ messageId: messageId }, { $set: req.body }, { new : true})
        .then( async (data) => { 
            const finalData = await MessageSchema.findOne({ messageId: messageId }, { __v: 0, _id: 0 });
            return res.status(200).json({ success: true, message: "Message updated successfully..", data: finalData });
        })
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/uploadFiles', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ success: false, error: "File not uploaded." })}
        const file = req.file;
        const blob = bucket.file(Date.now() + '_' + file.originalname);

        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });

        blobStream.on("error", (error) => {
            console.error(error);
            return res.status(500).json({ success: false, error: error , message: "Upload error" });
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

export default router;