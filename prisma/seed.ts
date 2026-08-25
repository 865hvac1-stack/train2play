import bcrypt from "bcryptjs";
import "dotenv/config";

import { createPrismaClient } from "../lib/db";
import { DEMO_VIDEO_URL } from "../lib/videos";
import { syncAthleteProfile } from "../lib/athlete-profiles";
import { runPhase1Foundation } from "../scripts/backfill-phase1";

const prisma = createPrismaClient();

function shouldSeedDemoAccounts() {
  if (process.env.SEED_DEMO === "true") return true;
  if (process.env.SEED_DEMO === "false") return false;
  return process.env.NODE_ENV !== "production";
}

async function main() {
  if (!shouldSeedDemoAccounts()) {
    console.log(
      "Skipping demo accounts. Set SEED_DEMO=true to load coach@example.com demo data.",
    );
    await runPhase1Foundation();
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  const onboardingCompletedAt = new Date();

  const coach = await prisma.user.upsert({
    where: { email: "coach@example.com" },
    update: {
      zipCode: "90210",
      latitude: 34.1031,
      longitude: -118.4168,
      searchRadiusMiles: 50,
      pickupAlertsEnabled: true,
      lookingForSport: "Baseball",
      lookingForPositions: "RHP,SS,OF",
      onboardingCompletedAt,
    },
    create: {
      name: "Demo Coach",
      email: "coach@example.com",
      passwordHash,
      zipCode: "90210",
      latitude: 34.1031,
      longitude: -118.4168,
      searchRadiusMiles: 50,
      pickupAlertsEnabled: true,
      lookingForSport: "Baseball",
      lookingForPositions: "RHP,SS,OF",
      onboardingCompletedAt,
    },
  });

  await prisma.user.upsert({
    where: { email: "coach2@example.com" },
    update: {
      zipCode: "90045",
      latitude: 33.9583,
      longitude: -118.3962,
      searchRadiusMiles: 50,
      pickupAlertsEnabled: true,
      lookingForSport: "Baseball",
      onboardingCompletedAt,
    },
    create: {
      name: "Westside Baseball",
      email: "coach2@example.com",
      passwordHash,
      zipCode: "90045",
      latitude: 33.9583,
      longitude: -118.3962,
      searchRadiusMiles: 50,
      pickupAlertsEnabled: true,
      lookingForSport: "Baseball",
      onboardingCompletedAt,
    },
  });

  const coach2 = await prisma.user.findUniqueOrThrow({
    where: { email: "coach2@example.com" },
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

  await prisma.trainingVideo.updateMany({
    where: {
      videoUrl: {
        contains: "ForBiggerBlazes",
      },
    },
    data: {
      videoUrl: DEMO_VIDEO_URL,
    },
  });

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
        videoUrl: DEMO_VIDEO_URL,
        annotations: {
          create: {
            timestampMs: 3000,
            label: "Plant foot",
            note: "Drive off the inside foot and stay low through the break.",
            strokes: JSON.stringify([
              {
                tool: "arrow",
                color: "#FF6600",
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

  const marcus = await prisma.athlete.findFirst({
    where: { coachId: coach.id, firstName: "Marcus" },
  });

  if (!marcus) {
    await prisma.athlete.create({
      data: {
        coachId: coach.id,
        firstName: "Marcus",
        lastName: "Delgado",
        sport: "Baseball",
        position: "RHP",
        throws: "R",
        bats: "R",
        dateOfBirth: new Date("2010-05-12"),
        notes: "Projectable frame. Working on off-speed consistency.",
        rosterStatus: "ROSTER",
        progressMetrics: {
          create: [
            {
              label: "Throwing velo",
              value: 78,
              unit: "mph",
              recordedAt: new Date("2026-08-20"),
              notes: "Pocket radar — bullpen",
            },
            {
              label: "Bat speed",
              value: 68,
              unit: "mph",
              recordedAt: new Date("2026-08-20"),
            },
            {
              label: "Exit velo",
              value: 82,
              unit: "mph",
              recordedAt: new Date("2026-08-20"),
            },
          ],
        },
      },
    });
  }

  const pickupPlayer = await prisma.athlete.findFirst({
    where: { firstName: "Jordan", lastName: "Price", rosterStatus: "PICKUP" },
  });

  if (!pickupPlayer) {
    await prisma.athlete.create({
      data: {
        coachId: coach2.id,
        firstName: "Jordan",
        lastName: "Price",
        sport: "Baseball",
        position: "SS / OF",
        throws: "R",
        bats: "L",
        notes: "Saturday scrimmage guest — strong hands, needs reps.",
        rosterStatus: "PICKUP",
        zipCode: "90045",
        latitude: 33.9583,
        longitude: -118.3962,
        pickupType: "LOOKING_FOR_TEAM",
        availabilityNotes: "Available Saturdays and summer showcases",
        listedForPickup: true,
        progressMetrics: {
          create: [
            {
              label: "Throwing velo",
              value: 72,
              unit: "mph",
              recordedAt: new Date("2026-08-24"),
              notes: "Logged at pickup signup",
            },
            {
              label: "Bat speed",
              value: 71,
              unit: "mph",
              recordedAt: new Date("2026-08-24"),
              notes: "Logged at pickup signup",
            },
            {
              label: "Exit velo",
              value: 79,
              unit: "mph",
              recordedAt: new Date("2026-08-24"),
            },
          ],
        },
      },
    });
  } else {
    await prisma.athlete.update({
      where: { id: pickupPlayer.id },
      data: {
        coachId: coach2.id,
        zipCode: "90045",
        latitude: 33.9583,
        longitude: -118.3962,
        pickupType: "LOOKING_FOR_TEAM",
        availabilityNotes: "Available Saturdays and summer showcases",
        listedForPickup: true,
      },
    });
  }

  // Demo athlete login (Hudson) — shared AthleteProfile linked to User
  let hudson = await prisma.athlete.findFirst({
    where: { coachId: coach.id, firstName: "Hudson", lastName: "Reed" },
  });

  if (!hudson) {
    hudson = await prisma.athlete.create({
      data: {
        coachId: coach.id,
        firstName: "Hudson",
        lastName: "Reed",
        sport: "Baseball",
        position: "Shortstop",
        throws: "R",
        bats: "R",
        dateOfBirth: new Date("2012-05-18"),
        notes: "Demo athlete account for Athlete Portal.",
        rosterStatus: "ROSTER",
        progressMetrics: {
          create: [
            {
              label: "Throwing velo",
              value: 68,
              unit: "mph",
              recordedAt: new Date("2026-07-01"),
            },
            {
              label: "Throwing velo",
              value: 71,
              unit: "mph",
              recordedAt: new Date("2026-08-10"),
            },
            {
              label: "Throwing velo",
              value: 72,
              unit: "mph",
              recordedAt: new Date("2026-08-24"),
            },
            {
              label: "60-yard dash",
              value: 8.03,
              unit: "sec",
              recordedAt: new Date("2026-07-15"),
            },
            {
              label: "60-yard dash",
              value: 7.82,
              unit: "sec",
              recordedAt: new Date("2026-08-20"),
            },
            {
              label: "Exit velo",
              value: 78,
              unit: "mph",
              recordedAt: new Date("2026-08-12"),
            },
            {
              label: "Exit velo",
              value: 81,
              unit: "mph",
              recordedAt: new Date("2026-08-24"),
            },
          ],
        },
        progressGoals: {
          create: [
            {
              label: "Throwing velo",
              targetValue: 75,
              unit: "mph",
            },
          ],
        },
      },
    });
  }

  const hudsonPlan = await prisma.trainingPlan.findFirst({
    where: {
      coachId: coach.id,
      athleteId: hudson.id,
      title: "4-Week Baseball Foundation (Sample/Demo)",
    },
  });

  if (!hudsonPlan) {
    // Soft-close older demo plans so Today's Training points at the sample loop
    await prisma.trainingPlan.updateMany({
      where: {
        coachId: coach.id,
        athleteId: hudson.id,
        status: "ACTIVE",
      },
      data: { status: "COMPLETED" },
    });

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const day3 = new Date(today);
    day3.setDate(day3.getDate() + 2);
    const day5 = new Date(today);
    day5.setDate(day5.getDate() + 4);
    const day7 = new Date(today);
    day7.setDate(day7.getDate() + 6);

    const throwingMetric = await prisma.metricDefinition.findUnique({
      where: {
        sport_slug: { sport: "Baseball", slug: "throwing_velocity" },
      },
    });
    const sprintMetric = await prisma.metricDefinition.findUnique({
      where: {
        sport_slug: { sport: "Baseball", slug: "ten_yard_sprint" },
      },
    });

    // Ensure metric defs exist even if foundation backfill order differs
    const throwingId =
      throwingMetric?.id ??
      (
        await prisma.metricDefinition.upsert({
          where: {
            sport_slug: { sport: "Baseball", slug: "throwing_velocity" },
          },
          update: {},
          create: {
            sport: "Baseball",
            slug: "throwing_velocity",
            name: "Throwing Velocity",
            category: "speed",
            unit: "mph",
            direction: "HIGHER_IS_BETTER",
          },
        })
      ).id;
    const sprintId =
      sprintMetric?.id ??
      (
        await prisma.metricDefinition.upsert({
          where: {
            sport_slug: { sport: "Baseball", slug: "ten_yard_sprint" },
          },
          update: {},
          create: {
            sport: "Baseball",
            slug: "ten_yard_sprint",
            name: "10-Yard Sprint",
            category: "speed",
            unit: "sec",
            direction: "LOWER_IS_BETTER",
          },
        })
      ).id;

    await prisma.trainingPlan.create({
      data: {
        coachId: coach.id,
        athleteId: hudson.id,
        title: "4-Week Baseball Foundation (Sample/Demo)",
        description:
          "SAMPLE/DEMO program for testing the coach → athlete training loop. Not a professionally validated protocol.",
        status: "ACTIVE",
        startDate: today,
        endDate: new Date(today.getTime() + 86400000 * 28),
        workouts: {
          create: [
            {
              title: "Workout A — Arm + Intent",
              description: "Arm care, intent throws, tee work, sprint.",
              scheduledDate: today,
              durationMinutes: 42,
              sortOrder: 0,
              instructionVideoUrl: DEMO_VIDEO_URL,
              exercises: {
                create: [
                  {
                    name: "Arm Care",
                    instructions:
                      "Band external rotations, scap pulls, and light catch.",
                    coachingCue: "Smooth tempo — no max effort.",
                    sets: 2,
                    reps: 10,
                    restSec: 45,
                    sortOrder: 0,
                    resultKind: "NONE",
                  },
                  {
                    name: "Intent Throw Series",
                    instructions: "Build from 50% to intent. 3 sets of 8 throws.",
                    coachingCue: "Athletic base. Finish through the target.",
                    sets: 3,
                    reps: 8,
                    restSec: 60,
                    sortOrder: 1,
                    resultRequired: true,
                    resultKind: "NUMBER",
                    resultUnit: "mph",
                    metricDefinitionId: throwingId,
                  },
                  {
                    name: "Tee Work",
                    instructions: "Line-drive focus. Middle-away and middle-in.",
                    coachingCue: "See it deep. Stay through contact.",
                    sets: 3,
                    reps: 8,
                    restSec: 45,
                    sortOrder: 2,
                    resultKind: "NONE",
                  },
                  {
                    name: "10-Yard Sprint",
                    instructions: "3 timed attempts from a two-point start.",
                    coachingCue: "Drive the first three steps.",
                    sets: 3,
                    reps: 1,
                    restSec: 90,
                    sortOrder: 3,
                    resultRequired: true,
                    resultKind: "TIME",
                    resultUnit: "sec",
                    metricDefinitionId: sprintId,
                  },
                ],
              },
            },
            {
              title: "Workout B — Mobility + Defense",
              description: "Mobility, hitting drill, footwork, core.",
              scheduledDate: day3,
              durationMinutes: 40,
              sortOrder: 1,
              exercises: {
                create: [
                  {
                    name: "Mobility",
                    instructions: "Hips, T-spine, and shoulder openers.",
                    sets: 2,
                    durationSec: 300,
                    sortOrder: 0,
                    resultKind: "NONE",
                  },
                  {
                    name: "Hitting Drill",
                    instructions: "Front toss — quality contact over volume.",
                    coachingCue: "Quiet head. Aggressive through the zone.",
                    sets: 4,
                    reps: 6,
                    restSec: 60,
                    sortOrder: 1,
                    resultKind: "NONE",
                  },
                  {
                    name: "Defensive Footwork",
                    instructions: "Funnel progressions and first-step angles.",
                    sets: 3,
                    reps: 8,
                    restSec: 45,
                    sortOrder: 2,
                    resultKind: "NONE",
                  },
                  {
                    name: "Core Work",
                    instructions: "Dead bugs, side planks, med-ball rotations.",
                    sets: 3,
                    reps: 10,
                    restSec: 40,
                    sortOrder: 3,
                    resultKind: "NONE",
                  },
                ],
              },
            },
            {
              title: "Workout A — Repeat",
              description: "Second A session in the sample week.",
              scheduledDate: day5,
              durationMinutes: 42,
              sortOrder: 2,
              exercises: {
                create: [
                  {
                    name: "Arm Care",
                    sets: 2,
                    reps: 10,
                    sortOrder: 0,
                    resultKind: "NONE",
                  },
                  {
                    name: "Intent Throw Series",
                    sets: 3,
                    reps: 8,
                    sortOrder: 1,
                    resultRequired: true,
                    resultKind: "NUMBER",
                    resultUnit: "mph",
                    metricDefinitionId: throwingId,
                  },
                  {
                    name: "Tee Work",
                    sets: 3,
                    reps: 8,
                    sortOrder: 2,
                    resultKind: "NONE",
                  },
                  {
                    name: "10-Yard Sprint",
                    sets: 3,
                    reps: 1,
                    sortOrder: 3,
                    resultRequired: true,
                    resultKind: "TIME",
                    resultUnit: "sec",
                    metricDefinitionId: sprintId,
                  },
                ],
              },
            },
            {
              title: "Workout B — Repeat",
              description: "Second B session in the sample week.",
              scheduledDate: day7,
              durationMinutes: 40,
              sortOrder: 3,
              exercises: {
                create: [
                  {
                    name: "Mobility",
                    sets: 2,
                    durationSec: 300,
                    sortOrder: 0,
                    resultKind: "NONE",
                  },
                  {
                    name: "Hitting Drill",
                    sets: 4,
                    reps: 6,
                    sortOrder: 1,
                    resultKind: "NONE",
                  },
                  {
                    name: "Defensive Footwork",
                    sets: 3,
                    reps: 8,
                    sortOrder: 2,
                    resultKind: "NONE",
                  },
                  {
                    name: "Core Work",
                    sets: 3,
                    reps: 10,
                    sortOrder: 3,
                    resultKind: "NONE",
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  const hudsonProfile = await syncAthleteProfile({
    id: hudson.id,
    coachId: coach.id,
    firstName: hudson.firstName,
    lastName: hudson.lastName,
    dateOfBirth: hudson.dateOfBirth,
    sport: hudson.sport,
    position: hudson.position,
  });

  const athleteUser = await prisma.user.upsert({
    where: { email: "athlete@example.com" },
    update: {
      name: "Hudson Reed",
      role: "ATHLETE",
      passwordHash,
      onboardingCompletedAt,
    },
    create: {
      name: "Hudson Reed",
      email: "athlete@example.com",
      passwordHash,
      role: "ATHLETE",
      onboardingCompletedAt,
    },
  });

  await prisma.athleteProfile.update({
    where: { id: hudsonProfile.id },
    data: { userId: athleteUser.id },
  });

  console.log("Seed complete.");
  console.log("Demo coach: coach@example.com / password123");
  console.log("Demo athlete: athlete@example.com / password123");
  console.log("Second coach (nearby demo): coach2@example.com / password123");

  await runPhase1Foundation();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
