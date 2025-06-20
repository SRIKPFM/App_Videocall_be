import express from 'express';
import admin from '../Helper/fcm.js';
import { UserLoginCredentials } from '../models/loginModels.js';
import { CallLogDetails } from '../models/callLogModels.js';
import { authendicate } from '../middleware/middleware.js';
import { getUserIdFromToken } from '../Helper/helper.js';
import { groupSchema } from '../models/groupModels.js';

const router = express.Router();

router.post('/api/sentNotification', authendicate, async (req, res) => {
  try {
    const { title, body } = req.body;
    const token = req.header('Authorization');
    const userId = await getUserIdFromToken(token);
    const findReceiverToken = await UserLoginCredentials.findOne({ userId: userId });
    if (!findReceiverToken) { return res.status(404).json({ success: false, error: "Recevier not found..!!" }) };
    const message = {
      notification: {
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

router.post('/api/sentCallNotification', authendicate, async (req, res) => {
  try {
    const { callType, callId, type, channelName, recevierUserId } = req.body;
    const token = req.header('Authorization');
    const userId = await getUserIdFromToken(token);
    const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
    const isRecevierExcist = await UserLoginCredentials.findOne({ userId: recevierUserId });
    const isCallExcist = await CallLogDetails.findOne({ callId: callId });
    if (!isUserExcist || !isRecevierExcist || !isCallExcist) {
      return res.status(404).json({ success: false, error: !isUserExcist ? "User not found..!!" : (!isRecevierExcist ? "Receiver not found..!!" : "Call log details not found..!!") });
    } else if (isUserExcist.isLoggedin === false || isRecevierExcist.isLoggedin === false) {
      return res.status(404).json({ success: false, error: "Your're not loggedin. Please Login first..!!" });
    } else if (!isRecevierExcist.fcmToken) {
      return res.status(404).json({ success: false, error: "Receiver doesn't have a fcm token." });
    } else {
      const payload = {
        token: isRecevierExcist.fcmToken,
        data: {
          title: type,
          body: type === "Incoming call" ? `You have a call from ${isUserExcist.userName}` : `You have a missed call from ${isUserExcist.userName}`,
          sound: "default",
          type: String(type),
          channelName: String(channelName),
          userId: String(userId),
          recevierUserId: String(recevierUserId),
          isCallee: 'true',
          callType: String(callType)
        },
        android: {
          priority: 'high'
        }
      };

      await admin.messaging().sendMultible(payload)
        .then((message) => { return res.status(200).json({ success: true, message: "Notification send successfully..!!", data: message }) })
        .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error });
  }
});

router.post('/api/sentCallNotificationForGroup', authendicate, async (req, res) => {
  try {
    const { callType, callId, type, channelName, groupId } = req.body;
    const token = req.header('Authorization');
    const userId = await getUserIdFromToken(token);

    const caller = await UserLoginCredentials.findOne({ userId });
    if (!caller || !caller.isLoggedin) {
      return res.status(404).json({ success: false, error: "Caller is not logged in or not found." });
    }

    const group = await groupSchema.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found." });
    }

    const groupMembersIds = group.members.filter(id => id !== userId);
    const groupMembers = await UserLoginCredentials.find({ userId: { $in: groupMembersIds } });

    const onlineMembers = groupMembers.filter(member => member.isLoggedin && member.fcmToken);
    if (onlineMembers.length === 0) {
      return res.status(400).json({ success: false, error: "No online members with FCM tokens." });
    }

    const fcmTokens = onlineMembers.map(member => member.fcmToken);

    const message = {
      tokens: fcmTokens,
      notification: {
        title: type,
        body: type === "Incoming group call"
          ? `You have a group call from ${group.name}`
          : `You have a missed group call from ${group.name}`,
      },
      data: {
        type: String(type),
        groupId: String(groupId),
        callId: String(callId),
        callerId: String(userId),
        isCallee: 'true',
        callType: String(callType),
        channelName: String(channelName)
      },
      android: {
        priority: 'high',
        notification: {
          sound: "default"
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);

    return res.status(200).json({
      success: true,
      message: `Sent ${response.successCount} notifications, ${response.failureCount} failed.`,
      failures: response.responses
        .filter(r => !r.success)
        .map(f => f.error?.message || 'Unknown error')
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/group/sentCallNotificationForGroup', authendicate, async (req, res) => {
  try {
    const { callType, callId, type, channelName, groupId } = req.body;
    const token = req.header('Authorization');
    const userId = await getUserIdFromToken(token);

    const caller = await UserLoginCredentials.findOne({ userId });
    if (!caller || !caller.isLoggedin) {
      return res.status(404).json({ success: false, error: "Caller is not logged in or not found." });
    }

    const group = await groupSchema.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found." });
    }

    const groupMembersIds = group.members.filter(id => id !== userId);
    const groupMembers = await UserLoginCredentials.find({ userId: { $in: groupMembersIds } });

    const online = [];
    const offlineFcmTokens = [];

    for (const member of groupMembers) {
      const socketId = onlineUsers[member.userId];
      const callPayload = {
        callId,
        callType,
        channelName,
        groupId,
        type,
        isCallee: 'true',
        caller: {
          userId,
          name: caller.name
        }
      };

      if (member.isLoggedin && socketId) {
        io.to(socketId).emit("incoming-group-call", callPayload);
        online.push(member.userId);
      } else if (member.fcmToken) {
        offlineFcmTokens.push(member.fcmToken);
      }
    }

    let fcmResult = null;
    if (offlineFcmTokens.length > 0) {
      const fcmMessage = {
        tokens: offlineFcmTokens,
        notification: {
          title: type,
          body: type === "Incoming group call"
            ? `You have a group call from ${group.name}`
            : `You have a missed group call from ${group.name}`,
        },
        data: {
          type: String(type),
          groupId: String(groupId),
          callId: String(callId),
          callerId: String(userId),
          isCallee: 'true',
          callType: String(callType),
          channelName: String(channelName)
        },
        android: {
          priority: 'high',
          notification: { sound: 'default' }
        }
      };

      fcmResult = await admin.messaging().sendMulticast(fcmMessage);
    }

    return res.status(200).json({
      success: true,
      message: `Call notifications sent successfully.`,
      onlineUsers: online,
      fcm: {
        sent: fcmResult?.successCount || 0,
        failed: fcmResult?.failureCount || 0,
        errors: fcmResult?.responses?.filter(r => !r.success).map(r => r.error?.message) || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


export default router;