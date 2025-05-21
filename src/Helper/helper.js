import { groupSchema } from "../models/groupMessageModels.js";
import jwt, { decode } from 'jsonwebtoken';
import { UserLoginCredentials } from "../models/loginModels.js";

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
};

export const getUserIdFromToken = (token) => {
    const secretKey = process.env.SECRET_KEY_FOR_TOKEN;
    const getUserId = jwt.verify(token, secretKey);
    return getUserId.userId;
};

export const getUserDataFromToken = async (token) => {
    try {
        const decoded = jwt.decode(token, process.env.SECRET_KEY_FOR_TOKEN);
        const getUserDetails = await UserLoginCredentials.findOne({ userId: decoded.userId },{ __v: 0, createdAt: 0, updatedAt: 0 });
        if (!getUserDetails) {
            return ({ success: false, error: "Can't get user details." });
        }
        return getUserDetails;
    } catch (error) {
        return ({ success: false, error: error.message });
    }
};

export const isGroupExcist = async (groupId) => {
    const isGroupExcist = await groupSchema.findOne({ groupId: groupId });
    if (!isGroupExcist) {
        return res.status(404).json({ success: false, error: "Can't find Group..!!" });
    }
    return isGroupExcist;
};

export const isUserAdmin = async (groupData, userId) => {
    if (!groupData.adminId.includes(userId)) {
        return res.status(404).json({ success: false, error: "You're not an admin..!!" });
    }
    return true;
};