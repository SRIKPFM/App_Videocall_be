import express from 'express';
import { UserLoginCredentials } from '../models/LoginModels';

const router = express.Router();

router.post('/api/userRegister', async (req, res) => {
    try {
        const { userId, userName, email, password, confirmPassword } = req.body;
        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId, email: email });
        if (isUserExcist) {
            return res.status(400).json({ success: false, error: "This email already registered.." });
        } else {
            if (password === confirmPassword) {
                const userStructure = new UserLoginCredentials({
                    userId: userId,
                    userName: userName,
                    email: email,
                    password: password
                })
                userStructure.save();
            }
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/userLogin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const isUser = await UserLoginCredentials.findOne({ email: email });
        if (!isUser) {
            return res.status(404).json({ success: false, error: "Couldn't find any user using this email. Enter a valid mail." });
        }
        return res.status(200).json({ success: true, message: "User loggedin successfully.." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;