/**
 * Local-only director login for verifying /trainer against real data.
 * Refuses to run in production so a known password never reaches live users.
 */
import bcrypt from "bcryptjs";

import { prisma } from "../lib/db";

const EMAIL = process.env.LOCAL_DIRECTOR_EMAIL ?? "director@example.com";
const PASSWORD = process.env.LOCAL_DIRECTOR_PASSWORD ?? "password123";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a known password in production");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const director = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { role: "TRAINER", onboardingCompletedAt: new Date() },
    create: {
      name: "Program Director",
      email: EMAIL,
      passwordHash,
      role: "TRAINER",
      onboardingCompletedAt: new Date(),
    },
  });

  console.log(`Director login ready: ${director.email} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
