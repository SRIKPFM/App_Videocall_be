import express from 'express';
import multer, { memoryStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { CallLogDetails } from '../models/callLogModels.js';
import { UserLoginCredentials } from '../models/loginModels.js';
import { authendicate } from '../middleware/middleware.js';
import { getUserIdFromToken } from '../Helper/helper.js';
import { groupCallLogSchema } from '../models/groupModels.js';

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
            recoredUrl: null,
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
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
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
        const { callId, status, startTime, endTime, recoredUrl } = req.body;
        const findCallLog = await CallLogDetails.findOne({ callId: callId });
        if (!findCallLog) {
            return res.status(404).json({ success: false, error: "Can't find call Log data." });
        }
        findCallLog.status = status || findCallLog.status;
        findCallLog.startTime = startTime || findCallLog.startTime;
        findCallLog.endTime = endTime || findCallLog.endTime;
        findCallLog.isCalling = status === "accepted" ? true : false;
        findCallLog.recoredUrl = recoredUrl ? recoredUrl : findCallLog.recoredUrl;

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

router.post('/api/createGroupCallLogs', authendicate, async (req, res) => {
    try {
        const { groupId, callType, status } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const callLogStructure = new groupCallLogSchema({
            callId: uuidv4(),
            groupId: groupId,
            initiatedBy: userId,
            callType: callType,
            status: "initiated",
            callInitiatedTime: Date.now(),
            startTime: Date.now(),
            endTime: null,
            duration: 0,
            recordedUrl: null,
            isCalling: true
        })
        await callLogStructure.save()
        .then(() => { return res.status(200).json({ success: true, message: "Group call logs created..!!" })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })})
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/groupCallLogs/updateStatus', authendicate, async (req, res) => {
    try {
        const { isCalling, callId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const ifCallExcist = await groupCallLogSchema.findOne({ callId: callId });
        if (!ifCallExcist) {
            return res.status(404).json({ success: false, error: "Can't find call logs." });
        }
        if (isCalling === false) {
            ifCallExcist.isCalling = isCalling;
            ifCallExcist.endTime = Date.now();
            if (ifCallExcist.startTime) {
                ifCallExcist.duration = Math.floor((ifCallExcist.endTime - ifCallExcist.startTime) / 1000);
            }
        }
        ifCallExcist.save()
        .then(() => { return res.status(200).json({ success: true, message: "Group call status updated..!!" }) })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/groupCallLogs/deleteGroupCallLogs', authendicate, async (req, res) => {
    try {
        const { callId } = req.body;
        const deleteGroupCallLogs = await groupCallLogSchema.findOneAndDelete({ callId: callId });
        if (!deleteGroupCallLogs) {
            return res.status(400).json({ success: false, error: "Can't delete group calllogs..!!" });
        }
        return res.status(200).json({ success: true, message: "Group calllogs successfully deleted..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/groupCallLogs/addParticipants', authendicate, async (req, res) => {
    try {
        const { callId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        console.log(userId)
        const log = await groupCallLogSchema.findOne({ callId: callId });
        console.log(log)
        if (!log) {
            return res.status(404).json({ success: false, error: "Can't find calllog details" });
        }
        let participants = log.participants.find(p => p.userId === userId);
        console.log(participants)
        if (!participants) {
            log.participants.push({ userId: userId, joinedAt: new Date() });
        } else {
            participants.joinedAt = new Date();
        }

        if (!log.startTime) {
            log.startTime = new Date();
            log.isCalling = true;
        }
        log.status = "onGoing"
        await log.save()
        .then(() => { return res.status(200).json({ success: true, message: "Participants join time set.", data: log })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
});

router.post('/api/groupCallLogs/updateLeavingParticipants', authendicate, async (req, res) => {
    try {
        const { callId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const log = await groupCallLogSchema.findOne({ callId: callId });
        if(!log) {
            return res.status(404).json({ success: false, error: "Can't find callLog details." });
        }
        const participants = log.participants.find(p => p.userId === userId);
        if (!participants) {
            return res.status(404).json({ success: false, error: "Participant not found.!" });
        }
        participants.disconnectedAt = new Date();
        if (participants.joinedAt) {
            participants.duration = Math.floor((participants.disconnectedAt - participants.joinedAt) / 1000);
        }

        const allLeft = log.participants.every(p => p.disconnectedAt);
        if (allLeft) {
            log.isCalling = false;
            log.endTime = new Date(),
            log.duration = Math.floor((log.endTime - log.startTime) / 1000);
            log.status = "completed"
        }

        await log.save()
        .then(() => { return res.status(200).json({ success: true, message: "Participant details updated successfully..!!" })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
})

export default router;