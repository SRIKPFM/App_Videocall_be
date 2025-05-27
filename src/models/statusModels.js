import mongoose from "mongoose";

var Schema = mongoose.Schema;

export const statusSchema = mongoose.model(
    "statusSchema",
    new Schema(
        {
            userId: String,
            audioUrl: String,
            videoUrl: String,
            writing: String,
            description: String,
            uploadedTime: Date,
            expireTime: Date
        }
    ),
    "statusSchema"
);