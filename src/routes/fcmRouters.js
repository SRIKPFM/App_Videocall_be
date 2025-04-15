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

router.post('/api/sentCallNotification', async (req, res) => {
    try {
        const { channelName, userId, recevierUserId } = req.body;
        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
        const isRecevierExcist = await UserLoginCredentials.findOne({ userId: recevierUserId });
        if (!isUserExcist || !isRecevierExcist) {
            return !isUserExcist ? "User not found..!!" : "Recevier not found..!!";
        }

        const payload = {
            token: isRecevierExcist.fcmToken,
            notification: {
                title: 'Incoming call',
                body: `You have a call from ${isUserExcist.userName}`
            },
            data: {
                type: 'Incoming call',
                channelName: channelName,
                userId: userId,
                recevierUserId: recevierUserId,
                isCallee: 'true'
            }
        };

        await admin.messaging().send(payload)
        .then((message) => { return res.status(200).json({ success: true, message: "Notification send successfully..!!", data: message })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })});
    } catch (error) {
        return res.status(500).json({ success: false, error: error });
    }
});

export default router;