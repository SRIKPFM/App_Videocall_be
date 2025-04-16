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
            isLoggedin: Boolean
        },
        {
            timestamps: true
        }
    ),
    "UserLoginCredentials"
);