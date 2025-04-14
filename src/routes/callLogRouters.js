import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CallLogDetails } from '../models/callLogModels.js';
import { UserLoginCredentials } from '../models/loginModels.js';

const router = express.Router();

router.post('/api/saveCallLogs', async (req, res) => {
    try {
        const { callerId, recevierId, callType, status, isCalling } = req.body;
        const isCallerOrRecevierIdExcist = await UserLoginCredentials.find({ callerId: callerId,recevierId });
        if (!isCallerOrRecevierIdExcist) {
            return res.status(404).json({ success: false, error: "Can't find caller or recevier data." });
        }
        const callStructure = {
            callId: uuidv4(),
            callerId: callerId,
            recevierId: recevierId,
            callType: callType,
            status: status,
            isCalling: isCalling,
            startTime: "",
            endTime: "",
            duration: 0
        };
        const createCallLog = await CallLogDetails.create(callStructure);
        if (!createCallLog) {
            return res.status(404).json({ success: false, message: "Can't create call log." });
        }
        return res.status(200).json({ success: true, message: "Call log created successfully.." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/updateCallLogs', async (req, res) => {
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

        if (findCallLog.startTime && findCallLog.endTime) {
            findCallLog.duration = Math.floor((new Date(findCallLog.endTime) - new Date(findCallLog.startTime))/1000);
        }

        await findCallLog.save();
        res.status(200).json({ success: true, message: findCallLog})
        const callExcist = await CallLogDetails.findOne({ })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;