import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import "dotenv/config";

import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const coach = await prisma.user.upsert({
    where: { email: "coach@example.com" },
    update: {},
    create: {
      name: "Demo Coach",
      email: "coach@example.com",
      passwordHash,
    },
  });

  const existingAthletes = await prisma.athlete.count({
    where: { coachId: coach.id },
  });

  if (existingAthletes === 0) {
    await prisma.athlete.createMany({
      data: [
        {
          coachId: coach.id,
          firstName: "Maya",
          lastName: "Chen",
          sport: "Basketball",
          position: "Point Guard",
          dateOfBirth: new Date("2011-03-14"),
          notes: "Strong court vision. Working on left-hand finishes.",
        },
        {
          coachId: coach.id,
          firstName: "Ethan",
          lastName: "Brooks",
          sport: "Football",
          position: "Wide Receiver",
          dateOfBirth: new Date("2010-08-02"),
          notes: "Focus on route precision and acceleration drills.",
        },
        {
          coachId: coach.id,
          firstName: "Sofia",
          lastName: "Reyes",
          sport: "Soccer",
          position: "Midfielder",
          dateOfBirth: new Date("2012-01-19"),
          notes: "Excellent stamina. Parent prefers Tuesday evening sessions.",
        },
      ],
    });
  }

  console.log("Seed complete.");
  console.log("Demo login: coach@example.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
