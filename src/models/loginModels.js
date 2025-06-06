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
            profilePicUrl: String,
            fcmToken: String,
            isLoggedin: Boolean,
            Description: String,
            pinedUsers: [{
                userName: String,
                userId: String
            }],
            lockedUserChat: [{
                userName: String,
                userId: String,
                password: String
            }],
            archivedUser:[{
                userName: String,
                userId: String
            }],
            favoritedUser: Array,
            passwordForArchive: String,
            status: Boolean
        },
        {
            timestamps: true
        }
    ),
    "UserLoginCredentials"
);