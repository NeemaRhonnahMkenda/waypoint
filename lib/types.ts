import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Trip data model. One zod schema is the single source of truth:     */
/*  it validates shared trips on the server, imported links and files, */
/*  and gives us the TypeScript types.                                 */
/* ------------------------------------------------------------------ */

export const CATEGORIES = [
  "stay",
  "transport",
  "food",
  "activities",
  "shopping",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  stay: "Stays",
  transport: "Transport",
  food: "Food & drink",
  activities: "Activities",
  shopping: "Shopping",
  other: "Other",
};


const id = z.string().min(1).max(40);
const shortText = (max: number) => z.string().max(max);
const isoDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
const time = z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]);
const money = z.number().finite().min(0).max(1e10);
const currency = z.string().regex(/^[A-Z]{3}$/);

/** Only http(s) links, so a shared trip can never smuggle in a javascript: URL. */
export const safeUrl = z.union([
  z.literal(""),
  z
    .string()
    .max(2000)
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    }, "Must be an http(s) link"),
]);

export const FamilySchema = z.object({ id, name: shortText(40).min(1) });

export const MemberSchema = z.object({
  id,
  name: shortText(40).min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  familyId: id.nullable(),
});

export const DestinationSchema = z.object({
  id,
  name: shortText(80).min(1),
  country: shortText(60),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  arrive: isoDate,
  depart: isoDate,
  status: z.enum(["idea", "planned"]),
  votes: z.array(id).max(50),
  notes: shortText(1000),
});

export const StaySchema = z.object({
  id,
  name: shortText(100).min(1),
  destinationId: id.nullable(),
  url: safeUrl,
  address: shortText(200),
  checkIn: isoDate,
  checkOut: isoDate,
  price: money,
  currency,
  status: z.enum(["idea", "booked"]),
  votes: z.array(id).max(50),
  notes: shortText(1000),
});

export const ActivitySchema = z.object({
  id,
  date: isoDate,
  time,
  title: shortText(100).min(1),
  place: shortText(120),
  url: safeUrl,
  category: z.enum(CATEGORIES),
  cost: money,
  currency,
  notes: shortText(1000),
});

export const ExpenseSchema = z.object({
  id,
  title: shortText(100).min(1),
  amount: money,
  currency,
  category: z.enum(CATEGORIES),
  date: isoDate,
  paidBy: id,
  splitAmong: z.array(id).min(1).max(50),
});

export const TripSchema = z.object({
  schema: z.literal(1),
  id,
  name: shortText(80).min(1),
  startDate: isoDate,
  endDate: isoDate,
  currency,
  notes: shortText(2000),
  families: z.array(FamilySchema).max(20),
  members: z.array(MemberSchema).max(50),
  destinations: z.array(DestinationSchema).max(60),
  stays: z.array(StaySchema).max(100),
  activities: z.array(ActivitySchema).max(500),
  expenses: z.array(ExpenseSchema).max(1000),
  budget: z.object({
    total: money,
    categories: z.record(z.enum(CATEGORIES), money),
  }),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

export type Family = z.infer<typeof FamilySchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type Stay = z.infer<typeof StaySchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Expense = z.infer<typeof ExpenseSchema>;
export type Trip = z.infer<typeof TripSchema>;

/** How a trip is linked to the shared store, kept only on this device. */
export type ShareInfo = {
  id: string;
  /** Present only for people holding the edit link. */
  editKey?: string;
  version: number;
  syncedAt: string;
};

export type LocalTrip = {
  trip: Trip;
  share?: ShareInfo;
  /** "Who are you?" on this device; drives votes and default payer. */
  me?: string;
  /** Local edits not yet pushed to the group. */
  dirty?: boolean;
};

export const MAX_TRIP_BYTES = 256 * 1024;
