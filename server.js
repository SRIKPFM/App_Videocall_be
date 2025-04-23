import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initiateApp } from './src/Helper/helper.js';
dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(bodyParser.urlencoded({extends: true}));
app.use(bodyParser.urlencoded({extended: false}));

mongoose.connect(process.env.MONGODBURI)
.then(() => console.log("Database connected successfully.."))
.catch((error) => console.log("Database not connected successfully.."));

initiateApp(app);

app.listen(port, () => {
    console.log(`Server successfully running on port ${port}`);
});