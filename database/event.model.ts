import mongoose, { Document, Model, Schema } from "mongoose";

// Valid event delivery modes — constrain to a fixed set to prevent inconsistent data
const EVENT_MODES = ["online", "in-person", "hybrid"] as const;
export type EventMode = typeof EVENT_MODES[number];

/**
 * Strongly-typed Event document interface.
 * Fields mirror the schema below; `createdAt`/`updatedAt` are added by timestamps.
 */
export interface EventDocument extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // ISO date string: YYYY-MM-DD
  time: string; // normalized to HH:mm (24-hour)
  mode: EventMode;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Basic non-empty string validator used across several fields
const nonEmptyString = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

// Slugify: lowercase, remove unsafe chars, collapse whitespace/hyphens
const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^-\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// Normalize a date string to YYYY-MM-DD. Throws on invalid input.
const normalizeDate = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date format; expected a parseable date string");
  }
  return d.toISOString().split("T")[0];
};

// Normalize time to HH:mm (24-hour). Accepts "HH:mm", "H:mm", or with am/pm.
const normalizeTime = (value: string): string => {
  const raw = String(value).trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) throw new Error("Invalid time format; expected HH:mm or h:mm am/pm");

  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const meridiem = m[4] ? m[4].toLowerCase() : undefined;

  // In 12-hour format, valid hours are 1–12. "13:00 pm" must be rejected.
  if (meridiem && (hour < 1 || hour > 12)) {
    throw new Error("Hour must be between 1 and 12 when using am/pm");
  }

  if (meridiem) {
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Invalid time values");
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const EventSchema = new Schema<EventDocument>(
  {
    title: { type: String, required: true, trim: true, validate: nonEmptyString },
    // Auto-generated from title in hooks; collisions are handled with a numeric suffix
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true, validate: nonEmptyString },
    overview: { type: String, required: true, trim: true, validate: nonEmptyString },
    image: { type: String, required: true, trim: true, validate: nonEmptyString },
    venue: { type: String, required: true, trim: true, validate: nonEmptyString },
    location: { type: String, required: true, trim: true, validate: nonEmptyString },
    date: { type: String, required: true, trim: true, validate: nonEmptyString },
    time: { type: String, required: true, trim: true, validate: nonEmptyString },
    mode: {
      type: String,
      required: true,
      enum: {
        values: EVENT_MODES,
        message: `Mode must be one of: ${EVENT_MODES.join(", ")}`,
      },
    },
    audience: { type: String, required: true, trim: true, validate: nonEmptyString },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) &&
          (arr as string[]).length > 0 &&
          (arr as string[]).every(nonEmptyString),
        message: "Agenda must be a non-empty array of strings",
      },
    },
    organizer: { type: String, required: true, trim: true, validate: nonEmptyString },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) && (arr as string[]).every(nonEmptyString),
        message: "Tags must be an array of non-empty strings",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index on date for efficiently querying upcoming/past events without a full collection scan
EventSchema.index({ date: 1 });

type UpdateDoc = {
  [key: string]: unknown;
  $set?: Record<string, unknown>;
};

/**
 * Pre-validate hook: generates slug BEFORE Mongoose runs validation.
 * Must live here — not in pre('save') — because slug is required:true and
 * Mongoose runs validation before pre('save'), which would fail on every new document.
 */
EventSchema.pre<EventDocument>("validate", async function () {
  if (this.isModified("title") || !this.slug) {
    const base = slugify(this.title);
    let slug = base;
    let i = 1;

    // Increment suffix until we find a slug not used by any other document
    while (await EventModel.exists({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${i++}`;
    }
    this.slug = slug;
  }
});

/**
 * Pre-save hook: normalizes date to YYYY-MM-DD and time to HH:mm,
 * only when those fields are modified.
 */
EventSchema.pre<EventDocument>("save", async function () {
  if (this.isModified("date")) this.date = normalizeDate(this.date);
  if (this.isModified("time")) this.time = normalizeTime(this.time);
});

/**
 * Pre-findOneAndUpdate hook:
 * - Regenerates slug if title is being updated (with collision handling)
 * - Normalizes date/time if those fields are being updated
 * Handles both direct updates ({ title: ... }) and operator form ({ $set: { title: ... } }).
 */
EventSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() as UpdateDoc | null;
  if (!update) return;

  // Read a field from whichever update form was used
  const getField = (key: string): string | undefined => {
    const direct = update[key];
    if (typeof direct === "string") return direct;

    const nested = update.$set?.[key];
    if (typeof nested === "string") return nested;

    return undefined;
  };

  // Write a field back to wherever it came from
  const setField = (key: string, value: string): void => {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      update[key] = value;
    } else {
      update.$set ??= {};
      update.$set[key] = value;
    }
  };

  const title = getField("title");
  if (title) {
    const base = slugify(title);
    let slug = base;
    let i = 1;

    // this.getQuery()._id is undefined when the filter doesn't use _id
    // (e.g. findOneAndUpdate({ slug: 'old-slug' }, ...)). Without this fallback,
    // the collision filter passes { $ne: undefined }, which matches every document
    // including the one being updated — causing an infinite suffix loop.
    const query = this.getQuery();
    let docId = query._id;
    if (!docId) {
      const existing = await EventModel.findOne(query, { _id: 1 }).lean();
      docId = existing?._id;
    }

    const collisionFilter = docId
      ? { slug, _id: { $ne: docId } }
      : { slug };

    while (await EventModel.exists(collisionFilter)) {
      slug = `${base}-${i++}`;
    }
    setField("slug", slug);
  }

  const date = getField("date");
  if (date) setField("date", normalizeDate(date));

  const time = getField("time");
  if (time) setField("time", normalizeTime(time));
});

// Reuse existing model if already compiled (prevents OverwriteModelError in dev hot reloads)
const EventModel: Model<EventDocument> =
  (mongoose.models.Event as Model<EventDocument>) ||
  mongoose.model<EventDocument>("Event", EventSchema);

export { EventModel as Event };