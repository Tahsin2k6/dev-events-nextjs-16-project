'use client';

import { createBooking } from "@/lib/actions/booking.action";
import posthog from "posthog-js";
import { useState } from "react";

const BookEvent = ({ eventID, slug }: { eventID: string, slug: string }) => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const result = await createBooking({ eventID, slug, email });

        if (result.success) {
            setSubmitted(true);
            posthog.capture('event_booked', { eventID, slug, email });
        } else {
            setErrorMsg(result.message ?? null);

            // only report genuinely unexpected failures, not normal duplicate-booking attempts
            if (result.code === 'unknown') {
                posthog.captureException(new Error(result.message ?? 'Unknown error'));
            }
        }
    };

    return (
        <div id="book-event">
            {submitted ? (
                <p>Thank you for signing up!</p>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} id="email" placeholder="Enter Your email address" />
                        <button type="submit" className="button-submit">Submit</button>
                        {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
                    </div>
                </form>
            )}
        </div>
    );
};

export default BookEvent;