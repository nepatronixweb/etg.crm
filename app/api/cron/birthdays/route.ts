/**
 * Cron: Birthday Wishes
 * GET /api/cron/birthdays
 *
 * Checks students and staff whose birthday is today and sends
 * them an email greeting via Nodemailer.
 *
 * Invoke via a scheduled job at start of each day UTC.
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Student from "@/models/Student";
import nodemailer from "nodemailer";

// Create transporter (configure via env vars)
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendBirthdayEmail(
  to: string,
  name: string,
  type: "staff" | "student"
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Birthday] Would send email to ${name} <${to}> (SMTP not configured)`);
    return;
  }

  const transporter = createTransporter();

  const subject =
    type === "staff"
      ? `🎂 Happy Birthday, ${name}! From the ETG Family`
      : `🎉 Birthday Greetings from Education Tree Global!`;

  const html =
    type === "staff"
      ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎂 Happy Birthday!</h1>
      </div>
      <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <p style="color: #111827; font-size: 18px;">Dear <strong>${name}</strong>,</p>
        <p style="color: #6b7280; line-height: 1.6;">Wishing you a wonderful birthday filled with joy and happiness! Thank you for your dedication and hard work at Education Tree Global.</p>
        <p style="color: #6b7280; line-height: 1.6;">May this year bring you new opportunities and great success. 🎉</p>
        <br/>
        <p style="color: #374151; font-weight: bold;">With warm wishes,<br/>The ETG Team</p>
      </div>
    </div>
  `
      : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Happy Birthday!</h1>
      </div>
      <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <p style="color: #111827; font-size: 18px;">Dear <strong>${name}</strong>,</p>
        <p style="color: #6b7280; line-height: 1.6;">Warm birthday greetings from all of us at Education Tree Global! We are honoured to be a part of your journey toward your educational dreams.</p>
        <p style="color: #6b7280; line-height: 1.6;">May this special day bring you happiness and may the year ahead be filled with success! 🌟</p>
        <br/>
        <p style="color: #374151; font-weight: bold;">With best wishes,<br/>Education Tree Global</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Education Tree Global" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

export async function GET(req: NextRequest) {
  // Simple secret check
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  const results = { staff: 0, students: 0, errors: 0 };

  // --- Staff birthdays ---
  const staffWithBirthdays = await User.find({
    isActive: true,
    dateOfBirth: { $exists: true, $ne: null },
  }).select("name email dateOfBirth");

  for (const user of staffWithBirthdays) {
    if (!user.dateOfBirth) continue;
    const dob = new Date(user.dateOfBirth);
    if (dob.getMonth() + 1 === month && dob.getDate() === day) {
      try {
        await sendBirthdayEmail(user.email, user.name, "staff");
        results.staff++;
      } catch (err) {
        console.error(`Failed to send birthday email to staff ${user.name}:`, err);
        results.errors++;
      }
    }
  }

  // --- Student birthdays ---
  const studentsWithBirthdays = await Student.find({
    dateOfBirth: { $exists: true, $ne: null },
  }).select("name email dateOfBirth");

  for (const student of studentsWithBirthdays) {
    if (!student.dateOfBirth || !student.email) continue;
    const dob = new Date(student.dateOfBirth);
    if (dob.getMonth() + 1 === month && dob.getDate() === day) {
      try {
        await sendBirthdayEmail(student.email, student.name, "student");
        results.students++;
      } catch (err) {
        console.error(`Failed to send birthday email to student ${student.name}:`, err);
        results.errors++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    date: `${day}/${month}/${today.getFullYear()}`,
    emailsSent: {
      staff: results.staff,
      students: results.students,
    },
    errors: results.errors,
    timestamp: new Date().toISOString(),
  });
}
