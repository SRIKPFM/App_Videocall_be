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
                location: { type: String, default: null }
            },
            deleteFor: [{ type: String }],
            isDeleteForEveryone: { type: Boolean, default: false },
            readBy: [String],
            timeStamp: { type: Date, default: Date.now }
        }
    ),
    "GroupMessageSchema"
);