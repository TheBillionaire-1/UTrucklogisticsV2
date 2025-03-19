import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define valid booking statuses
export const BookingStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  IN_TRANSIT: "in_transit",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

// Enhanced user table with profile information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  profileImage: text("profile_image"),
});

// Enhanced bookings table with additional fields
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  pickupCoords: text("pickup_coords").notNull(),
  dropoffCoords: text("dropoff_coords").notNull(),
  status: text("status").$type<BookingStatus>().notNull().default(BookingStatus.PENDING),
  estimatedPrice: text("estimated_price"),
  actualPrice: text("actual_price"),
  distance: text("distance"),
  duration: text("duration"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).extend({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  profileImage: z.string().optional(),
});

export const insertBookingSchema = createInsertSchema(bookings)
  .omit({ id: true, userId: true, updatedAt: true, createdAt: true })
  .extend({
    pickupCoords: z.string(),
    dropoffCoords: z.string(),
    estimatedPrice: z.string().optional(),
    distance: z.string().optional(),
    duration: z.string().optional(),
    notes: z.string().optional(),
  });

export const updateBookingStatusSchema = z.object({
  status: z.enum([
    BookingStatus.PENDING,
    BookingStatus.ACCEPTED,
    BookingStatus.IN_TRANSIT,
    BookingStatus.COMPLETED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type UpdateBookingStatus = z.infer<typeof updateBookingStatusSchema>;