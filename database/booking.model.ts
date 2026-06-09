import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { Event } from './event.model';

/**
 * Booking document interface.
 * - `eventId` references an existing Event document.
 * - `email` is stored lowercased and trimmed, validated for proper format.
 */
export interface BookingDocument extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Basic email format validator. RFC-compliant regex is extremely long;
// this catches the vast majority of malformed addresses.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<BookingDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // normalize before storage — User@Example.com === user@example.com
      maxlength: [254, 'Email must not exceed 254 characters'], // RFC 5321 limit
      validate: {
        validator: (v: unknown) => typeof v === 'string' && emailRegex.test(v),
        message: 'Invalid email address',
      },
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound unique index: one booking per email address per event.
// Prevents the same person from booking the same event multiple times.
BookingSchema.index({ eventId: 1, email: 1 }, { unique: true });

/**
 * Pre-save hook: verifies the referenced event exists.
 * Only runs when eventId is new or modified.
 */
BookingSchema.pre<BookingDocument>('save', async function () {
  if (!this.isModified('eventId')) return;

  const exists = await Event.exists({ _id: this.eventId });
  if (!exists) throw new Error('Referenced event does not exist');
});

/**
 * Pre-findOneAndUpdate hook: verifies the referenced event exists
 * when eventId is being changed via an update operation.
 * Handles both direct updates ({ eventId: ... }) and operator form ({ $set: { eventId: ... } }).
 */
BookingSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate() as
    | { eventId?: Types.ObjectId | string; $set?: { eventId?: Types.ObjectId | string } }
    | null;
  if (!update) return;

  const eventId = update.eventId ?? update.$set?.eventId;
  if (!eventId) return;

  const exists = await Event.exists({ _id: eventId });
  if (!exists) throw new Error('Referenced event does not exist');
});

const BookingModel: Model<BookingDocument> =
  (mongoose.models.Booking as Model<BookingDocument>) ||
  mongoose.model<BookingDocument>('Booking', BookingSchema);

export { BookingModel as Booking };