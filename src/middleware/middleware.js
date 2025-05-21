import jwt from 'jsonwebtoken';
import { UserLoginCredentials } from "../models/loginModels.js";

export const authendicate = async (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ success: false, error: "Access-Denied" });
    }
    try {
        const verified = jwt.verify(token, process.env.SECRET_KEY_FOR_TOKEN);
        const isUserExcist = await UserLoginCredentials.findOne({ userId: verified.userId });
        if (!verified.userId && !isUserExcist) {
            return res.status(404).json({ success: false, error: "Invalid User" });
        }
        next();
    } catch (error) {
        if (error.name === "jwt expired") {
            return res.status(401).json({ success: false, error: "Session Expried" });
        }
        else if (error.name === "JsonWebTokenError") {
            return res.status(403).json({ success: false, error: "Invalid User" });
        }
        else {
            return res.json({ success: false, error: error.message });
        }
    }
};