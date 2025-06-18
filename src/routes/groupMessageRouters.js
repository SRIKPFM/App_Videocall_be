import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { groupSchema } from '../models/groupModels.js';
import { groupMessageSchema } from '../models/groupModels.js';
import { getUserIdFromToken, isGroupExcist, isUserAdmin } from '../Helper/helper.js';
import { authendicate } from '../middleware/middleware.js';
import { UserLoginCredentials } from '../models/loginModels.js';

export const router = express.Router();

export function setupGroupChat(io, onlineUsers) {
    io.on('connection', (socket) => {
        socket.on('join_group', (groupId) => {
            socket.join(groupId);
            console.log(`User ${socket.id} joined group ${groupId}.`)
        });

        socket.on('sent_group_message', async (data) => {
            const { groupId, senderId, text, imageUrl, videoUrl, audioUrl, documentUrl, location, contact } = data;

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
                        location: location,
                        contact: contact ? contact : null
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

        socket.on('forward_message_group', async (data) => {
            const { senderId, groupId, isForwarded, forwardedFrom, forwardedFromMessageId, messages } = data;
            const forwardedMessages = [];
            try {
                const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
                if (!isGroupExcist) {
                    return socket.emit("errorMessage", { error: "Group not found." });
                }
                for (const msg of messages) {
                    const original = await groupMessageSchema.findOne({ messageId: forwardedFromMessageId });
                    if (!original) continue;

                    const newMessage = new groupMessageSchema({
                        messageId: uuidv4(),
                        groupId: groupId,
                        senderId: senderId,
                        content: {
                            text: original.content.text ? original.content.text : null,
                            imageUrl: original.content.imageUrl ? original.content.imageUrl : null,
                            videoUrl: original.content.videoUrl ? original.content.videoUrl : null,
                            audioUrl: original.content.audioUrl ? original.content.audioUrl : null,
                            documentUrl: original.content.documentUrl ? original.content.documentUrl : null,
                            location: original.content.location ? original.content.location : null,
                            contact: original.content.contact ? original.content.contact : null,
                            timeStamp: original.content.timeStamp ? original.content.timeStamp : null
                        },
                        isForwarded: true,
                        forwardedFrom: msg.forwardedFrom || original.senderId,
                        forwardedFromMessageId: msg.originalMessageId
                    });

                    await newMessage.save();
                    io.to(groupId).emit("newMessage", newMessage);
                    forwardedMessages.push(newMessage);
                }                
            } catch (error) {
                return socket.emit("errorMessage", { error: "Failed to forward message" });
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
        const totalMembers = members.unshift(createrId)
        const groupStructure = new groupSchema({
            groupId: uuidv4(),
            name: name,
            createrId: createrId,
            adminId: [createrId],
            members: members,
            groupProfilePicUrl: null
        });

        await groupStructure.save()
            .then((data) => { return res.status(200).json({ success: true, message: "Group created successfully..!!", data: data }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getGroupDetails', authendicate, async (req, res) => {
    try {
        const { groupId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const getGroupDetails = await groupSchema.findOne({ groupId: groupId }, { _id:0, __v:0 });
        if(!getGroupDetails) {
            return res.status(404).json({ success: false, error: "Group not found." });
        }
        const isUserMember = getGroupDetails.members.find(id => id === userId);
        if (!isUserMember) {
            return res.status(400).json({ success: false, error: "You're not a group member." });
        }
        return res.status(200).json({ success: true, data: getGroupDetails });
    } catch (error) {
        return res.status(500).json({ success:false, error: error.message });
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

router.post('/api/getGroupMessages', authendicate, async (req, res) => {
    try {
        const { groupId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const findGroup = await isGroupExcist(groupId);
        const getGroupMessages = await groupMessageSchema.find({ groupId: groupId, isDeleteForEveryone: { $ne: true }, deleteFor: { $ne: userId } }, { _id: 0, __v: 0, groupId: 0 })
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

router.post('/api/addMember', authendicate, async (req, res) => {
    try {
        const { groupId, members } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
        if (!isUserExcist) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
        if (!isGroupExcist) {
            return res.status(404).json({ success: false, error: "Group not found." });
        }

        isGroupExcist.members = isGroupExcist.members.concat(members);
        isGroupExcist.save()
        .then(() => { return res.status(200).json({ success: true, message: "Members added successfully..!!" })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })})
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/removeMember', authendicate, async (req, res) => {
    try {
        const { removeMemberIds, groupId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
        if (!isUserExcist) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
        if (!isGroupExcist) {
            return res.status(404).json({ success: false, error: "Group not found." });
        }

        const filteredMembers = isGroupExcist.members.filter((data) => !removeMemberIds.includes(data));
        isGroupExcist.members = filteredMembers;
        isGroupExcist.save()
        .then(() => { return res.status(200).json({ success: true, message: "Members removed successfully..!!" })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })})
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

router.post('/api/updateGroupDetails', authendicate, async (req, res) => {
    try {
        const updates = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const isGroupExcist = await groupSchema.findOne({ groupId: updates.groupId });
        if (!isGroupExcist) {
            return res.status(404).json({ success: false, error: "Group not fount." });
        }
        const isUserInGroup = isGroupExcist.members.find(id => id === userId);
        if (!isUserInGroup) {
            return res.status(400).json({ success: fasle, error: "You're not a member of this group." });
        }
        const updateGroupDetails = await groupSchema.findOneAndUpdate({ groupId: updates.groupId }, { $set: updates });
        if (!updateGroupDetails) {
            return res.status(400).json({ success: false, error: "Can't update group details." });
        }
        return res.status(200).json({ success: true, message: "Group details updated successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/group/delete-for-me', authendicate, async (req, res) => {
    try {
        const { groupId, messageId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const findGroup = await isGroupExcist(groupId);

        const deleteMessage = await groupMessageSchema.updateOne({ messageId: messageId }, { $addToSet: { deleteFor: userId } });
        if (!deleteMessage) {
            return res.status(400).json({ success: false, error: "Error occurred while deleting message" });
        }
        return res.status(200).json({ success: true, message: "Message deleted successfully..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
});

router.post('/api/group/deleteForEveryone', authendicate, async (req, res) => {
    try {
        const { groupId, messageId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
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
                admin: group.adminId,
                members: group.members,
                profilePic: group.groupProfilePicUrl,
                createrId: group.createrId,
                lastMessage: message?.lastMessage || "[No messages yet]",
                timeStamp: message?.timeStamp || group.updatedAt || group.createdAt,
                unreadCount: message?.unreadCount || 0,
                isAdminOnly: group.isAdminOnly
            };
        });

        result.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp));

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;  