import mongoose from "mongoose";

var Schema = mongoose.Schema;

export const TodolistSchema = mongoose.model(
    "TodolistSchema",
    new Schema(
        {
            userId: String,
            tdlId: String,
            title: String,
            date: Date,
            text: String,
            imageUrl: String,
            alarm: Date,
            voiceUrl: String,
            status: { type: String, enum: [ 'Completed', 'Today', 'Upcoming' ], default: "Future" }
        },
        { 
            timestamps: true
        }
    ),
    "TodolistSchema"
);