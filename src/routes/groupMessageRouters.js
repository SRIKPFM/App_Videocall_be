import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { groupSchema } from '../models/groupMessageModels.js';
import { groupMessageSchema } from '../models/groupMessageModels.js';
import { getUserIdFromToken, isGroupExcist, isUserAdmin } from '../Helper/helper.js';
import { authendicate } from '../middleware/middleware.js';

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

        socket.on('groupMessageRead', async ({ groupId, userId }) => {
            await groupMessageSchema.updateMany(
                {
                    groupId: groupId,
                    readBy: { $ne: userId }
                },
                {
                    $addToSet: { readBy: userId }
                }
            )
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
        const totalMembers = members.unshift(createrId)
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

router.post('/api/storeGroupMessages', async (req, res) => {
    try {
        const { senderId, groupId, text, imageUrl, videoUrl, audioUrl, documentUrl } = req.body;
        const isUserExcist = await groupSchema.findOne({ groupId: groupId });
        if (!isUserExcist) { return res.status(404).json({ success: fasle, error: "group not found..!!" }) };
        if (!senderId) { return res.status(400).json({ success: false, error: "senderId or receiverId is required..!!" }) };
        const createMessage = {
            messageId: uuidv4(),
            groupId: groupId,
            senderId: senderId,
            content: {
                text: text ? text : null,
                imageUrl: imageUrl ? imageUrl : null,
                videoUrl: videoUrl ? videoUrl : null,
                audioUrl: audioUrl ? audioUrl : null,
                documentUrl: documentUrl ? documentUrl : null
            }
        };
        const storeMessages = await groupMessageSchema.create(createMessage)
            .then((data) => { return res.status(200).json({ success: true, message: "Message stored successfully..", data: data }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getGroupMessages', async (req, res) => {
    try {
        const { groupId } = req.body;
        const findGroup = await isGroupExcist(groupId);
        const getGroupMessages = await groupMessageSchema.find({ groupId: groupId }, { _id: 0, __v: 0, groupId: 0 })
            .sort({ timeStamp: -1 });
        if (getGroupMessages.length === 0) {
            return res.status(404).json({ success: false, error: "There is no message found for this group.." });
        }
        return res.status(200).json({ success: true, groupId: groupId, data: getGroupMessages });
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
        const findGroup = await isGroupExcist(groupId);
        const checkAdmin = await isUserAdmin(findGroup, userId);
        if (checkAdmin === true) {
            const admins = findGroup.adminId.concat(selectedMembers);
            findGroup.adminId = admins;

            await findGroup.save()
                .then(() => { return res.status(200).json({ success: true, message: "Admin added successfully..!!" }) })
                .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/removeAdmin', async (req, res) => {
    try {
        const { groupId, userId, selectedMembers } = req.body;
        const findGroup = await isGroupExcist(groupId);
        const checkAdmin = await isUserAdmin(findGroup, userId);
        if (checkAdmin === true) {
            const filteredMembers = findGroup.adminId.filter((data) => !selectedMembers.includes(data));
            findGroup.adminId = filteredMembers;
            await findGroup.save()
                .then(() => { return res.status(200).json({ success: true, message: "Admin removed successfully..!!" }) })
                .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/updateAdminOnly', async (req, res) => {
    try {
        const { groupId, userId, status } = req.body;
        const findGroup = await isGroupExcist(groupId);
        const checkAdmin = await isUserAdmin(findGroup, userId);
        if (checkAdmin === true) {
            findGroup.isAdminOnly = status;
            await findGroup.save()
                .then(() => { return res.status(200).json({ success: true, message: "Features updated successfully..!!" }) })
                .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/delete-for-me', async (req, res) => {
    try {
        const { groupId, userId, messageId } = req.body;
        const findGroup = await isGroupExcist(groupId);

        const deleteMessage = await groupMessageSchema.updateOne({ messageId: messageId }, { $addToSet: { deleteForMe: userId } });
        if (!deleteMessage) {
            return res.status(400).json({ success: false, error: "Error occurred while deleting message" });
        }
        return res.status(200).json({ success: true, message: "Message deleted successfully..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
});

router.post('/api/deleteForEveryone', async (req, res) => {
    try {
        const { groupId, userId, messageId } = req.body;
        const findGroup = await isGroupExcist(groupId);
        const findMessage = await groupMessageSchema.findOne({ messageId: messageId, groupId: groupId });
        if (!findMessage) { return res.status(404).json({ success: false, error: "Can't find message..!!" }) }
        if (findMessage.senderId !== userId) { return res.status(400).json({ success: false, error: "You're not authorized to delete this message..!!" }) }

        const deleteMessage = await groupMessageSchema.updateOne({ messageId: messageId }, { isDeleteForEveryone: true });
        if (!deleteMessage) {
            return res.status(400).json({ success: false, error: "Error occurred while deleting message" });
        }
        return res.status(200).json({ success: true, message: "Message deleted successfully..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/recentGroupChat', authendicate, async (req, res) => {
    try {
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const groups = await groupSchema.find({ members: userId }).lean();

        const groupIds = groups.map(group => group.groupId);

        const recentMessages = await groupMessageSchema.aggregate([
            {
                $match: {
                    groupId: { $in: groupIds },
                    $or: [
                        { isDeleteForEveryone: { $exists: false } },
                        { isDeleteForEveryone: false }
                    ],
                    deleteFor: { $ne: userId }
                }
            },
            { $sort: { timeStamp: -1 } },
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
                    _id: "$groupId",
                    lastMessage: { $first: "$lastMessage" },
                    timeStamp: { $first: "$timeStamp" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$senderId", userId] },
                                        { $not: { $in: [userId, "$readBy"] } },
                                        { $not: { $in: [userId, "$deleteFor"] } }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const messageMap = new Map(recentMessages.map(m => [m._id.toString(), m]));

        const result = groups.map(group => {
            const message = messageMap.get(group.groupId.toString());
            return {
                groupId: group.groupId,
                groupName: group.name,
                lastMessage: message?.lastMessage || "[No messages yet]",
                timeStamp: message?.timeStamp || group.updatedAt || group.createdAt,
                unreadCount: message?.unreadCount || 0
            };
        });

        result.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp));

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;  