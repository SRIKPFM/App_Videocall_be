import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
dotenv.config();

const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(bodyParser.urlencoded({extends: true}));
app.use(bodyParser.urlencoded({extended: false}));

mongoose.connect(process.env.MONGODBURI)
.then(() => console.log("Database connected successfully.."))
.catch((error) => console.log("Database not connected successfully.."));

app.listen(() => {
    console.log(`Server successfully running on port ${process.env.PORT}`);
});