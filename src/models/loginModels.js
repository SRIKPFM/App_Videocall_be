import mongoose from "mongoose";

var Schema = mongoose.Schema;

export const UserLoginCredentials = mongoose.model(
    "UserLoginCredentials",
    new Schema(
        {
            userId: String,
            userName: String,
            email: String,
            password: String,
            fcmToken: String,
            isLoggedin: Boolean,
            pinedUsers: [{
                userName: String,
                userId: String
            }],
            lockedUserChat: [{
                userName: String,
                userId: String,
                password: Number
            }]
        },
        {
            timestamps: true
        }
    ),
    "UserLoginCredentials"
);