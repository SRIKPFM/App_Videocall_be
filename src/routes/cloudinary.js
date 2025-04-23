import express from 'express';
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

cloudinary.config({
    cloud_name: "divinwelb",
    api_key: "731699916219541",
    api_secret: "4VIx6OnQAaDr3tQjdHpaFgRWOdA"
});