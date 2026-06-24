'use server';

import { Event } from "@/database";
import connectDB from "../mongodb";

export const getEventBySlug = async (slug: string) => {
    try {
        await connectDB();
        return await Event.findOne({ slug }).lean();
    } catch (err) {
        console.error('getEventBySlug failed:', err);
        return null;
    }
}

export const getSimilarEvents = async (excludeId: string, tags: string[]) => {
    try {
        await connectDB();
        return await Event.find({ _id: { $ne: excludeId }, tags: { $in: tags } }).lean();
    } catch (err) {
        console.error('getSimilarEvents failed:', err);
        return [];
    }
}

export const getAllEvents = async () => {
    try {
        await connectDB();
        return await Event.find().sort({ createdAt: -1 }).lean();
    } catch (err) {
        console.error('getAllEvents failed:', err);
        return [];
    }
}