import mongoose from "mongoose";

var Schema = mongoose.Schema;

export const MessageSchema = mongoose.model(
    "MessageSchema",
    new Schema(
        {
            senderId: String,
            receiverId: String,
            content: {
                text: String,
                imageUrl: String,
                videoUrl: String,
                documentUrl: String,
                timeStamp: { type: Date, default: Date.now }
            }
        }
    ),
    "MessageSchema"
);