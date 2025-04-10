import mongoose from "mongoose";

var Schema = mongoose.Schema;

export const ContactDetails = mongoose.model(
    'ContactDetails',
    new Schema (
        {
            userId: String,
            userContactDetails: [
                {
                    firstName: String,
                    lastName: String,
                    idNumber: String,
                    birthday: Date,
                    mobNum: String,
                    saveTo: String
                }
            ]
        },
        {
            timestamps: true
        }
    ),
    'ContactDetails'
);