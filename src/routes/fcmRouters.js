import express from 'express';
import admin from '../Helper/fcm.js';
import { UserLoginCredentials } from '../models/loginModels.js';

const router = express.Router();

router.post('/api/sentNotification', async (req, res) => {
    try {
        const { userId, title, body } = req.body;
        const findReceiverToken = await UserLoginCredentials.findOne({ userId: userId });
        if(!findReceiverToken) { return res.status(404).json({ success: false, error: "Recevier not found..!!" })}; 
        const message = {
            notification:{
                title: title,
                body: body
            },
            token: findReceiverToken.fcmToken
        };
        const response = await admin.messaging().send(message);
        return res.status(200).json({ success: true, message: "Notification send successfully..!!", response: response });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;