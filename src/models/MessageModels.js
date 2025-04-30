import mongoose from "mongoose";

var Schema = mongoose.Schema;

export const MessageSchema = mongoose.model(
    "MessageSchema",
    new Schema(
        {
            messageId: String,
            senderId: String,
            receiverId: String,
            content: {
                text: String,
                imageUrl: String,
                videoUrl: String,
                audioUrl: String,
                documentUrl: String,
                timeStamp: { type: Date, default: Date.now }
            },
            isPined: Boolean
        }
    ),
    "MessageSchema"
);