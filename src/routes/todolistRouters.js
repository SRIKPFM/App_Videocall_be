import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TodolistSchema } from '../models/todolistModels.js';
import { authendicate } from '../middleware/middleware.js';
import { getUserIdFromToken } from '../Helper/helper.js';

const router = express.Router();

router.post('/api/createTodolist', authendicate, async (req, res) => {
    try {
        const { title, date, text, imageUrl, alarm, voiceUrl } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        const tdlStructure = {
            userId: userId,
            tdlId: uuidv4(),
            title: title ? title : null,
            date: new Date(date),
            text: text ? text : null,
            imageUrl: imageUrl ? imageUrl : null,
            alarm: alarm ? alarm : null,
            voiceUrl: voiceUrl ? voiceUrl : null,
            status: today.getTime() === selectedDate.getTime() ? "Today" : (today.getTime() < selectedDate.getTime() ? "Upcoming" : "Completed")
        };
        const createTodolist = await TodolistSchema.create(tdlStructure)
            .then(() => { return res.status(200).json({ success: true, data: "Todolist created successfully..!1" }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/updateTdlStatus', authendicate, async (req, res) => {
    try {
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const getAllTodolist = await TodolistSchema.find({ userId: userId });
        if (getAllTodolist.length === 0) {
            return res.status(404).json({ success: false, error: "There is no data found for this user..!!" });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const getFutureTdl = getAllTodolist.filter((data) => data.status === "Upcoming");
        const updateTodayTdl = getFutureTdl.map(async (item) => {
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);

            if (itemDate.getTime() === today.getTime()) {
                await TodolistSchema.updateOne({ tdlId: item.tdlId }, { $set: { status: "Today" } });
            }
        });
        const getTodayTdl = getAllTodolist.filter((data) => data.status === "Today");
        const updateCompletedTdl = getTodayTdl.map(async (item) => {
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);

            if (itemDate.getTime() < today.getTime()) {
                await TodolistSchema.updateOne({ tdlId: item.tdlId }, { $set: { status: "Completed" } });
            }
        });
        if (updateTodayTdl || updateCompletedTdl) {
            return res.status(200).json({ success: true, data: "Todo's status updated successfully..!!" });
        } else {
            return res.status(400).json({ success: false, error: "Can't update Todo's status..!!" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getTodos', authendicate, async (req, res) => {
    try {
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const getTodos = await TodolistSchema.find({ userId: userId }, { __v: 0, _id: 0, createdAt: 0, updatedAt: 0 });
        if (getTodos.length === 0) {
            return res.status(404).json({ success: false, error: "There is no Todos for this user", data: [] })
        } 
        return res.status(200).json({ success: true, data: getTodos });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/deleteTodos', authendicate, async (req, res) => {
    try {
        const { tdlId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);
        const deleteTodos = await TodolistSchema.findOneAndDelete({ userId: userId, tdlId: tdlId });
        if (!deleteTodos) {
            return res.status(400).json({ success: false, error: "Can't delete this Todo." });
        }
        return res.status(200).json({ success: true, data: "Todo deleted successfully..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;