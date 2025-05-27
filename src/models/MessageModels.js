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
                contact: { name: String, num: String },
                timeStamp: { type: Date, default: Date.now }
            },
            isPined: Boolean,
            deletedFor: [{ type: String }],
            isDeletedForEveryone: { type: Boolean, default: false },
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