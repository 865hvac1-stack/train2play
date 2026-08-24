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

  const existingPlans = await prisma.trainingPlan.count({
    where: { coachId: coach.id },
  });

  if (existingPlans === 0) {
    const maya = await prisma.athlete.findFirst({
      where: { coachId: coach.id, firstName: "Maya" },
    });
    const ethan = await prisma.athlete.findFirst({
      where: { coachId: coach.id, firstName: "Ethan" },
    });

    if (maya) {
      await prisma.trainingPlan.create({
        data: {
          coachId: coach.id,
          athleteId: maya.id,
          title: "Pre-season basketball conditioning",
          description:
            "Build endurance and court agility before the season opener.",
          status: "ACTIVE",
          startDate: new Date("2026-08-01"),
          endDate: new Date("2026-09-15"),
          workouts: {
            create: [
              {
                title: "Agility ladder and footwork",
                description: "3 rounds: ladder drills, defensive slides, closeouts.",
                scheduledDate: new Date("2026-08-25"),
                durationMinutes: 45,
                completed: true,
                completedAt: new Date("2026-08-24"),
                sortOrder: 0,
              },
              {
                title: "Ball handling circuit",
                description: "Two-ball dribbling, cone weave, finish at rim.",
                scheduledDate: new Date("2026-08-27"),
                durationMinutes: 50,
                sortOrder: 1,
              },
              {
                title: "Scrimmage conditioning",
                description: "Half-court 3-on-3 with sprint penalties.",
                scheduledDate: new Date("2026-08-29"),
                durationMinutes: 60,
                sortOrder: 2,
              },
            ],
          },
        },
      });
    }

    if (ethan) {
      await prisma.trainingPlan.create({
        data: {
          coachId: coach.id,
          athleteId: ethan.id,
          title: "WR route-running progression",
          description: "Weekly route tree reps with acceleration focus.",
          status: "ACTIVE",
          startDate: new Date("2026-08-18"),
          workouts: {
            create: [
              {
                title: "Route tree reps",
                description: "Slant, out, post, go — 10 reps each side.",
                scheduledDate: new Date("2026-08-26"),
                durationMinutes: 40,
                sortOrder: 0,
              },
              {
                title: "Release and burst drills",
                description: "Press releases, stem work, burst off break point.",
                scheduledDate: new Date("2026-08-28"),
                durationMinutes: 35,
                sortOrder: 1,
              },
            ],
          },
        },
      });
    }

    await prisma.trainingPlan.create({
      data: {
        coachId: coach.id,
        title: "General off-season template",
        description: "Reusable plan for any athlete during off-season weeks.",
        status: "ACTIVE",
        workouts: {
          create: [
            {
              title: "Dynamic warm-up and mobility",
              description: "Band work, hip openers, light plyometrics.",
              durationMinutes: 20,
              sortOrder: 0,
            },
            {
              title: "Strength and core",
              description: "Bodyweight squats, lunges, planks, push-ups.",
              durationMinutes: 30,
              sortOrder: 1,
            },
          ],
        },
      },
    });
  }

  const existingMetrics = await prisma.progressMetric.count({
    where: { athlete: { coachId: coach.id } },
  });

  if (existingMetrics === 0) {
    const maya = await prisma.athlete.findFirst({
      where: { coachId: coach.id, firstName: "Maya" },
    });
    const ethan = await prisma.athlete.findFirst({
      where: { coachId: coach.id, firstName: "Ethan" },
    });

    if (maya) {
      await prisma.progressMetric.createMany({
        data: [
          {
            athleteId: maya.id,
            label: "Vertical jump",
            value: 22,
            unit: "in",
            recordedAt: new Date("2026-07-15"),
            notes: "Baseline measurement",
          },
          {
            athleteId: maya.id,
            label: "Free throw %",
            value: 68,
            unit: "%",
            recordedAt: new Date("2026-08-10"),
          },
        ],
      });
    }

    if (ethan) {
      await prisma.progressMetric.createMany({
        data: [
          {
            athleteId: ethan.id,
            label: "40-yard dash",
            value: 4.92,
            unit: "sec",
            recordedAt: new Date("2026-07-20"),
            notes: "Hand-timed",
          },
          {
            athleteId: ethan.id,
            label: "40-yard dash",
            value: 4.85,
            unit: "sec",
            recordedAt: new Date("2026-08-18"),
            notes: "Improved burst off the line",
          },
        ],
      });
    }
  }

  const existingGoals = await prisma.progressGoal.count({
    where: { athlete: { coachId: coach.id } },
  });

  if (existingGoals === 0) {
    const ethan = await prisma.athlete.findFirst({
      where: { coachId: coach.id, firstName: "Ethan" },
    });

    if (ethan) {
      await prisma.progressGoal.create({
        data: {
          athleteId: ethan.id,
          label: "40-yard dash",
          targetValue: 4.75,
          unit: "sec",
          direction: "LOWER",
          dueDate: new Date("2026-09-30"),
        },
      });
    }
  }

  const existingVideos = await prisma.trainingVideo.count({
    where: { coachId: coach.id },
  });

  if (existingVideos === 0) {
    const ethan = await prisma.athlete.findFirst({
      where: { coachId: coach.id, firstName: "Ethan" },
    });

    await prisma.trainingVideo.create({
      data: {
        coachId: coach.id,
        athleteId: ethan?.id ?? null,
        title: "Route break — coaching example",
        description: "Sample clip for drawing arrows and adding written direction.",
        sourceType: "URL",
        videoUrl:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        annotations: {
          create: {
            timestampMs: 3000,
            label: "Plant foot",
            note: "Drive off the inside foot and stay low through the break.",
            strokes: JSON.stringify([
              {
                tool: "arrow",
                color: "#059669",
                width: 4,
                points: [
                  { x: 0.35, y: 0.55 },
                  { x: 0.55, y: 0.45 },
                ],
              },
            ]),
          },
        },
      },
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
