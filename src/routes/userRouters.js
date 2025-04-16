import express from 'express';
import { UserLoginCredentials } from '../models/loginModels.js';

const router = express.Router();

router.get('/api/checkServer', async (req, res) => {
    console.log("Server is running...");
});

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
                    password: password,
                    fcmToken: null,
                    isLoggedin: false
                })
                userStructure.save()
                    .then(() => { return res.status(200).json({ success: true, message: "User registered successfully..!!" })});
            } else {
                return res.status(404).json({ success: false, error: "Enter the correct passowrd..!!" });
            }
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/userLoginOrLogout', async (req, res) => {
    try {
        const { type, email, password } = req.body;
        const isUser = await UserLoginCredentials.findOne({ email: email });
        if (!isUser) {
            return res.status(404).json({ success: false, error: "Couldn't find any user using this email. Enter a valid mail." });
        } else if ( type === 'login' ) {
            if (isUser.password === password) {
                isUser.isLoggedin = true;
                await isUser.save();
                return res.status(200).json({ success: true, message: "User loggedin successfully..", userId: isUser.userId });
            }
            return res.status(404).json({ success: false, error: "Please enter the correct details." });    
        } else if ( type === "logout" ){
            isUser.isLoggedin = false;
            await isUser.save();
            return res.status(200).json({ success: true, message: "User loggedout successfully..", userId: isUser.userId });
        } else {
            return res.status(400).json({ success: false, message: "Please enter the valid type value.." });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getUser', async (req, res) => {
    try {
        const { userId } = req.body;
        const findUser = await UserLoginCredentials.findOne({ userId: userId }, { createdAt: 0, updatedAt: 0, __v: 0 })
            .then((userDetails) => { return res.status(200).json({ success: true, data: userDetails }) })
            .catch((error) => { return res.status(404).json({ success: false, error: "Can't find user details." }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/sendFcmTokenToBackend', async (req, res) => {
    try {
        const { userId, token } = req.body;
        if (!token) { return res.status(404).json({ success: false, error: "Token is missing..!!" }) };
        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
        if (!isUserExcist) { return res.status(400).json({ success: false, error: "User not found..!!" }) };
        const updateToken = await UserLoginCredentials.findOneAndUpdate({ userId: userId }, { $set: { fcmToken: token }});
        if (updateToken) { return res.status(200).json({ success: true, message: "Token stored successfully.." })};
        return res.status(400).json({ success: false, error: "Error occured while storing token.." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;