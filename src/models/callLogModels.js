import mongoose from "mongoose";

var Schema = mongoose.Schema;

export const CallLogDetails = mongoose.model(
    "CallLogDetails",
    new Schema(
        {
            callId: String,
            callerId: String,
            recevierId: String,
            callType: String,
            status: String,
            startTime: Date,
            endTime: Date,
            duration: Number,
            isCalling: Boolean
        }
    ),
    "CallLogDetails"
);