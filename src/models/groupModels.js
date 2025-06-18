import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

var Schema = mongoose.Schema;

export const groupSchema = mongoose.model(
    "GroupSchema",
    new Schema(
        {
            groupId: { type: String, default: uuidv4(), unique: true },
            name: String,
            createrId: String,
            adminId: [String],
            members: [String],
            groupDescription: String,
            groupProfilePicUrl: { type: String, defaut: null },
            isAdminOnly: { type: Boolean, default: false },
            createdAt: { type: Date, default: Date.now }
        }
    ),
    "GroupSchema"
);

export const groupMessageSchema = mongoose.model(
    "GroupMessageSchema",
    new Schema(
        {
            messageId: { type: String, default: uuidv4() },
            groupId: String,
            senderId: String,
            content: {
                text: { type: String, default: null },
                imageUrl: { type: String, default: null },
                videoUrl: { type: String, default: null },
                audioUrl: { type: String, default: null },
                documentUrl: { type: String, default: null },
                location: { type: String, default: null },
                contact: { name: String, num: String },
                timeStamp: { type: Date, default: Date.now() }
            },
            isForwarded: { type: Boolean, default: false },
            forwardedFrom: { type: String, default: null },
            forwardedFromMessageId: { type: String, default: null },
            replayFor: { type: String, default: null },
            deleteFor: [{ type: String }],
            isDeleteForEveryone: { type: Boolean, default: false },
            readBy: [String],
            timeStamp: { type: Date, default: Date.now }
        }
    ),
    "GroupMessageSchema"
);

export const ParticipantsSchema = mongoose.model(
    "ParticipantsSchema",
    new Schema(
        {
            groupId: String,
            userId: String,
            joinedAt: Date,
            disconnectedAt: Date,
            duration: Number
        },
        {
            timestamps: true
        }
    ),
    "ParticipantsSchema"
);

export const groupCallLogSchema = mongoose.model(
    "groupCallLogSchema",
    new Schema(
        {
            callId: { type: String, required: true },
            groupId: { type: String, required: true },
            initiatedBy: { type: String, required: true },
            callType: { type: String, enum: ["voice", "video"], required: true },
            status: { type: String, enum: ["initiated", "onGoing", "completed", "rejected"], required: true },
            callInitiatedTime: { type: Date, default: Date.now },
            startTime: { type: Date, default: null },
            endTime: { type: Date, default: null },
            duration: Number,
            recordedUrl: String,
            participants: [
                {
                    userId: String,
                    joinedAt: Date,
                    disconnectedAt: Date,
                    duration: Number
                }
            ],
            isCalling: Boolean
        },
        {
            timestamps: true
        }
    ),
    "groupCallLogSchema"
);