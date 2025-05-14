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

            const adminDetials = await groupSchema.findOne({ groupId: groupId });
            if (adminDetials.isAdminOnly === true) {
                console.log("Only admin can sent a message in this group..!!");
            } else {
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
            }
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
            .then((data) => { return res.status(200).json({ success: true, message: "Group created successfully..!!", data: data }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// router.post('/api/storeGroupMessages', async (req, res) => {
//     try {
//         const { senderId, groupId, text, imageUrl, videoUrl, audioUrl, documentUrl } = req.body;
//         const isUserExcist = await groupSchema.findOne({ groupId: groupId });
//         if (!isUserExcist) { return res.status(404).json({ success: fasle, error: "group not found..!!" })};
//         if (!senderId) { return res.status(400).json({ success: false, error: "senderId or receiverId is required..!!" }) };
//         const createMessage = {
//             messageId: uuidv4(),
//             groupId: groupId,
//             senderId: senderId,
//             content: {
//                 text: text ? text : null,
//                 imageUrl: imageUrl ? imageUrl : null,
//                 videoUrl: videoUrl ? videoUrl : null,
//                 audioUrl: audioUrl ? audioUrl : null,
//                 documentUrl: documentUrl ? documentUrl : null
//             }
//         };
//         const storeMessages = await groupMessageSchema.create(createMessage)
//             .then((data) => { return res.status(200).json({ success: true, message: "Message stored successfully..", data: data }) })
//             .catch((error) => { return res.status(400).json({ success: false, error: error }) });
//     } catch (error) {
//         return res.status(500).json({ success: false, error: error.message });
//     }
// });

router.post('/api/getGroupMessages', async (req, res) => {
    try {
        const { groupId } = req.body;
        const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
        if (!isGroupExcist) {
            return res.status(404).json({ success: false, error: "Can't find group.." });
        }
        const getGroupMessages = await groupMessageSchema.find({ groupId: groupId }, { _id: 0, __v: 0 })
            .sort({ createdAt: -1 });
        if (getGroupMessages.length === 0) {
            return res.status(404).json({ success: false, error: "There is no message found for this group.." });
        }
        return res.status(200).json({ success: true, data: getGroupMessages });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/updateGroupMessage', async (req, res) => {
    try {
        const { groupId, messageId, newText } = req.body;
        const isMessageExcist = await groupMessageSchema.findOne({ groupId: groupId, messageId: messageId });
        if (!isMessageExcist) {
            return res.status(404).json({ success: false, error: "Can't find the message.." });
        }
        isMessageExcist.content.text = newText;
        await isMessageExcist.save()
            .then(() => { return res.status(200).json({ success: true, message: "Message updated successfully..!!" }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/addAdmin', async (req, res) => {
    try {
        const { groupId, userId, selectedMembers } = req.body;
        const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
        if (!isGroupExcist) { return res.status(404).json({ success: false, error: "There is no group..!!" }) };
        if (!isGroupExcist.adminId.includes(userId)) {
            return res.status(400).json({ success: false, error: "Only admin can add admin..!!" });
        }
        const admins = isGroupExcist.adminId.concat(selectedMembers);
        isGroupExcist.adminId = admins;

        await isGroupExcist.save()
            .then(() => { return res.status(200).json({ success: true, message: "Admin added successfully..!!" }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/removeAdmin', async (req, res) => {
    try {
        const { groupId, userId, selectedMembers } = req.body;
        const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
        if (!isGroupExcist) { return res.status(404).json({ success: false, error: "Can't find group.." }) };
        if (!isGroupExcist.adminId.includes(userId)) {
            return res.status(400).json({ success: false, error: "Only admin can add admin..!!" });
        }
        
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router; 