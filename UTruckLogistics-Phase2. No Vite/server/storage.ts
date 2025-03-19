import { users, bookings, type User, type InsertUser, type Booking, type InsertBooking, type UpdateBookingStatus, BookingStatus } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

const PostgresStore = connectPg(session);
const pool = db.$client;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createBooking(booking: InsertBooking & { userId: number }): Promise<Booking>;
  getUserBookings(userId: number): Promise<Booking[]>;
  updateBookingStatus(bookingId: number, userId: number, status: UpdateBookingStatus): Promise<Booking | undefined>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    console.log(`Created user: ${user.username} with ID: ${user.id}`);
    return user;
  }

  async createBooking(booking: InsertBooking & { userId: number }): Promise<Booking> {
    const now = new Date();
    const [newBooking] = await db
      .insert(bookings)
      .values({
        ...booking,
        status: BookingStatus.PENDING,
        updatedAt: now,
        createdAt: now,
      })
      .returning();
    return newBooking;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.id));
  }

  async updateBookingStatus(
    bookingId: number,
    userId: number,
    { status }: UpdateBookingStatus
  ): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    if (!booking || booking.userId !== userId) {
      return undefined;
    }

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updatedBooking;
  }
}

export const storage = new DatabaseStorage();