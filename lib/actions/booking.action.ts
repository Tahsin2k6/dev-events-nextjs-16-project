'use server';

import { Booking } from "@/database";
import connectDB from "../mongodb";

export const createBooking = async ({ eventID, slug, email }: { eventID: string, slug: string, email: string }) => {
    try {
        await connectDB();
        await Booking.create({ eventId: eventID, slug, email });
        return { success: true };
    } catch (e: unknown) {
        const mongoErr = e as { code?: number };

        if (mongoErr?.code === 11000) {
            return {
                success: false,
                code: 'duplicate' as const,
                message: "You're already signed up for this event!",
            };
        }

        console.error('Create booking failed!', e);
        return {
            success: false,
            code: 'unknown' as const,
            message: 'Something went wrong. Please try again.',
        };
    }
}