import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { groupSchema } from '../models/groupMessageModels.js';
import { groupMessageSchema } from '../models/groupMessageModels.js';

const router = express.Router();

export function setupGroupChat(io, onlineUsers) {
    io.on('connection', (socket) => {
        socket.on('join_group', (groupId) => {
            socket.join(groupId);
            console.log(`User ${socket.id} joined group ${groupId}.`)
        });

        socket.on('sent_group_message', async (data) => {
            const { groupId, senderId, text, imageUrl, videoUrl, audioUrl, documentUrl, location } = data;

            const newMessage = new groupMessageSchema({
                messageId: uuidv4(),
                groupId: groupId,
                senderId: senderId, 
                content: {
                    text: text,
                    imageUrl: imageUrl,
                    videoUrl: videoUrl,
                    audioUrl: audioUrl,
                    documentUrl: documentUrl,
                    location: location 
                }
            });

            await newMessage.save();

            io.to(groupId).emit('newGroupMessage', newMessage);
        });
    })
};

router.post('/api/createGroup', async (req, res) => {
    try {
        const { name, createrId, members } = req.body;

        const isGroupExcist = await groupSchema.findOne({ name: name });
        if (isGroupExcist) {
            return res.status(400).json({ success: false, error: "This name already excist.." });
        } 
        const groupStructure = new groupSchema({
            groupId: uuidv4(),
            name: name,
            createrId: createrId,
            adminId: [createrId],
            members: members
        });

        await groupStructure.save()
        .then(() => { return res.status(200).json({ success: true, message: "Group created successfully..!!" })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
})

export default router; 