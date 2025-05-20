import { groupSchema } from "../models/groupMessageModels.js";
import jwt from 'jsonwebtoken';

export const getFolderByMimeType = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.startsWith('video/')) return 'videos';
    if (mimetype.startsWith('audio/')) return 'audios';
    return 'documents';
};

export const generateToken = (data) => {
    const secretKey = process.env.SECRET_KEY_FOR_TOKEN;
    const token = jwt.sign(data, secretKey);
    return token;
}

export const getUserIdFromToken = (token) => {
    const secretKey = process.env.SECRET_KEY_FOR_TOKEN;
    const getUserId = jwt.verify(token, secretKey);
    return getUserId.userId;
}

export const isGroupExcist = async (groupId) => {
    const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
    if (!isGroupExcist) {
        return res.status(404).json({ success: false, error: "Can't find Group..!!" });
    }
    return isGroupExcist;
}

export const isUserAdmin = async (groupData, userId) => {
    if (!groupData.adminId.includes(userId)) {
        return res.status(404).json({ success: false, error: "You're not an admin..!!" });
    }
    return true;
}