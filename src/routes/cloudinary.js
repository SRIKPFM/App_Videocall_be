import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { v2 as cloudinary } from "cloudinary";
import { getFolderByMimeType } from '../Helper/helper.js';

const router = express.Router();

cloudinary.config({
    cloud_name: "divinwelb",
    api_key: "731699916219541",
    api_secret: "4VIx6OnQAaDr3tQjdHpaFgRWOdA"
});

const upload = multer({ dest: 'temp/' });

router.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const filePath = req.file.path;
        const mimetype = req.file.mimetype;
        const folder = getFolderByMimeType(mimetype);

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
            folder: `${folder}/${senderId}-To-${receiverId}`
        });
        console.log(result);

        fs.unlinkSync(filePath);

        return res.status(200).json({
            url: result.secure_url,
            public_id: result.public_id,
            folder: folder,
            resource_type: result.resource_type
        });
    } catch (error) {
        return res.status(500).json({ success: true, error: error.message });
    }
});

router.post('/api/uploadTodolistFiles', upload.single('file'), async (req, res) => {
    try {
        const { userId } = req.body;
        const filePath = req.file.path;
        const mimetype = req.file.mimetype;
        const folder = getFolderByMimeType(mimetype);

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
            folder: `Todolist/${userId}`
        });
        console.log(result);

        fs.unlinkSync(filePath);

        return res.status(200).json({
            url: result.secure_url,
            public_id: result.public_id,
            folder: folder,
            resource_type: result.resource_type
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;