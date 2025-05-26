import express from 'express';
import multer, { memoryStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { CallLogDetails } from '../models/callLogModels.js';
import { UserLoginCredentials } from '../models/loginModels.js';
import { authendicate } from '../middleware/middleware.js';
import { getUserIdFromToken } from '../Helper/helper.js';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.post('/api/saveCallLogs', authendicate, async (req, res) => {
    try {
        const { recevierId, callType, status, isCalling } = req.body;
        const token = req.header('Authorization');
        const callerId = await getUserIdFromToken(token);
        const isCallerExcist = await UserLoginCredentials.findOne({ userId: callerId });
        const isReceiverExcist = await UserLoginCredentials.findOne({ userId: recevierId });
        if (!isCallerExcist || !isReceiverExcist) {
            return res.status(404).json({ success: false, error: "Can't find caller or recevier data." });
        }
        const callStructure = {
            callId: uuidv4(),
            callerId: callerId,
            recevierId: recevierId,
            callType: callType,
            status: status,
            isCalling: isCalling,
            callInitiatedTime: Date.now(),
            startTime: "",
            endTime: "",
            duration: 0
        };
        const createCallLog = await CallLogDetails.create(callStructure)
            .then((data) => { return res.status(200).json({ success: true, message: "Call log created successfully..", data: data }) })
            .catch((error) => { return res.status(404).json({ success: false, message: "Can't create call log.", error: error }) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getCallLogs', authendicate, async (req, res) => {
    try {
        const { userId } = req.body;
        const getIncomingCalls = await CallLogDetails.find({
            $or: [
                {callerId: userId},
                {recevierId: userId}
            ]
        }, { _id: 0, __v: 0 })
            .then((data) => { return res.status(200).json({ success: true, data: data }) })
            .catch((error) => { return res.status(404).json({ success: false, error: "Can't find user Incoming call details..!!", data: error.message }) })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/updateCallLogs', authendicate, async (req, res) => {
    try {
        const { callId, status, startTime, endTime } = req.body;
        const findCallLog = await CallLogDetails.findOne({ callId: callId });
        if (!findCallLog) {
            return res.status(404).json({ success: false, error: "Can't find call Log data." });
        }
        findCallLog.status = status || findCallLog.status;
        findCallLog.startTime = startTime || findCallLog.startTime;
        findCallLog.endTime = endTime || findCallLog.endTime;
        console.log((new Date(findCallLog.startTime) - new Date(findCallLog.endTime)));
        findCallLog.isCalling = status === "accepted" ? true : false;

        if (findCallLog.startTime && findCallLog.endTime) {
            findCallLog.duration = Math.floor((new Date(findCallLog.endTime) - new Date(findCallLog.startTime)) / 1000);
        }

        await findCallLog.save()
            .then((data) => console.log(data));
        res.status(200).json({ success: true, message: findCallLog })
        const callExcist = await CallLogDetails.findOne({})
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/uploadAndSaveCallRecording', upload.single('file'), async (req, res) => {
    try {

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;