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
                location: String,
                timeStamp: { type: Date, default: Date.now }
            },
            isPined: Boolean,
            isMessageDelivered: { type: String, enum: [ 'sent', 'delivered', 'read' ], default: 'sent'},
            isMessageReaded: { type: Boolean, default: false}
        }
    ),
    "MessageSchema"
);

export const UnReadMessages = mongoose.model(
    "UnReadMessages",
    new Schema(
        {
            userId: String,
            messageIds: Array
        }
    )
);