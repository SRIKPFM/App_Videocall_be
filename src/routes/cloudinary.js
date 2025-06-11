import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from "cloudinary";
import { getFolderByMimeType, getUserIdFromToken } from '../Helper/helper.js';
import { authendicate } from '../middleware/middleware.js';
import { groupSchema } from '../models/groupModels.js';
import { UserLoginCredentials } from '../models/loginModels.js';

const router = express.Router();

cloudinary.config({
    cloud_name: "divinwelb",
    api_key: "731699916219541",
    api_secret: "4VIx6OnQAaDr3tQjdHpaFgRWOdA"
});

const upload = multer({ dest: 'temp/' });

router.post('/api/upload', authendicate, upload.single('file'), async (req, res) => {
    try {
        const { receiverId } = req.body;
        const token = req.header('Authorization');
        const senderId = await getUserIdFromToken(token);
        const filePath = req.file.path;
        const mimetype = req.file.mimetype;
        const folder = getFolderByMimeType(mimetype);

        const originalNameWithExt = path.parse(req.file.originalname);
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: folder === "documents" ? 'raw' : (folder === "images" ? 'image' : 'video'),
            folder: `${folder}/${senderId}-To-${receiverId}`,
            public_id: `${originalNameWithExt.name}${originalNameWithExt.ext}`
        });
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

router.post('/api/uploadStatus', authendicate, upload.single('file'), async (req, res) => {
    try {
        const token = req.header('Authorization');
        const senderId = await getUserIdFromToken(token);
        if (!req.file) {
            return res.status(404).json({ success: false, error: "File required..!!" });
        } else {
            const filePath = req.file.path;
            const mimetype = req.file.mimetype;
            const folder = getFolderByMimeType(mimetype);
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
})

router.post('/api/uploadPdf', authendicate, upload.single('pdf'), async (req, res) => {
    try {
        const { receiverId } = req.body;
        const token = req.header('Authorization');
        const senderId = await getUserIdFromToken(token);
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }

        // only accept PDFs
        if (req.file.mimetype !== 'application/pdf') {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, error: 'Only PDF files are allowed' });
        }

        // upload to Cloudinary as raw
        const publicId = path.parse(req.file.originalname).name;
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'raw',
            public_id: `documents/${senderId}-${receiverId}/${publicId}`,
            format: 'pdf'         // enforce .pdf extension
        });

        // delete local temp file
        fs.unlinkSync(req.file.path);

        // secure_url will be something like
        // https://res.cloudinary.com/…/raw/upload/v123456789/documents/yourfile.pdf
        const viewUrl = result.secure_url;
        const downloadUrl = viewUrl.replace('/upload/', '/upload/attachment=true/');

        return res.json({
            success: true,
            viewUrl,      // opens inline in Chrome’s PDF viewer
            downloadUrl   // forces a “Save as…” dialog
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/api/uploadTodolistFiles', authendicate, upload.single('file'), async (req, res) => {
    try {
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const filePath = req.file.path;
        const mimetype = req.file.mimetype;
        const folder = getFolderByMimeType(mimetype);

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: folder === "documents" ? 'raw' : (folder === "images" ? 'image' : 'video'),
            folder: `Todolist/${userId}`
        });

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

router.post('/api/uploadRecoredFiles', authendicate, upload.single('file'), async (req, res) => {
    try {
        const { receiverId } = req.body;
        const token = req.header('Authorization');
        const senderId = await getUserIdFromToken(token);
        if (!senderId || !receiverId || !req.file) {
            return res.status(400).json({ success: false, error: "Missing required fields..!!" });
        }

        const filePath = req.file.path;
        const mimetype = req.file.mimetype;
        const folder = getFolderByMimeType(mimetype);

        const originalNameWithExt = path.parse(req.file.originalname);

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'video',
            folder: folder === "videos" ? `RecordedFile/Videofile/${senderId}-To-${receiverId}` : `RecordedFile/Audiofile/${senderId}-To-${receiverId}`,
            public_id: `${originalNameWithExt.name}${originalNameWithExt.ext}`
        });

        fs.unlinkSync(filePath);

        return res.status(200).json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/uploadProfilePicture', authendicate, upload.single('file'), async (req, res) => {
    try {
        const { groupId, type } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const userData = await UserLoginCredentials.findOne({ userId: userId });

        if (!req.file || !token) {
            return res.status(400).json({ success: false, error: "Required files missing..!!" });
        }
        
        const groupData = groupId ? await groupSchema.findOne({ groupId: groupId }) : null;

        const filePath = req.file.path;
        const mimetype = req.file.mimetype;
        const folder = getFolderByMimeType(mimetype);

        const originalNameWithExt = path.parse(req.file.originalname);

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'image',
            folder: type === "Individual" ? `ProfilePicture/${type}/${userData.userName}-${userData.userId}` : `ProfilePicture/${type}/${groupData.name}-${groupId}`,
            public_id: `${userData.userName}.${originalNameWithExt.ext}`
        });

        fs.unlinkSync(filePath);
        
        if (!result) {
            return res.status(400).json({ success: false, error: "Error occurred while changing or updating profile picture." });
        } else {
            userData.profilePicUrl = result.secure_url;
            await userData.save()
            .then(() => { return res.status(200).json({ success: true, message: "Profile picture updated successfully.." }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;