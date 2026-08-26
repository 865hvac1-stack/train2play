/**
 * Local-only Platform Admin login for verifying /admin against real data.
 * Refuses to run in production so a known password never reaches live users.
 */
import bcrypt from "bcryptjs";

import { prisma } from "../lib/db";

const EMAIL = process.env.LOCAL_ADMIN_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.LOCAL_ADMIN_PASSWORD ?? "password123";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a known password in production");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      role: "PLATFORM_ADMIN",
      isActive: true,
      deactivatedAt: null,
      onboardingCompletedAt: new Date(),
    },
    create: {
      name: "Platform Admin",
      email: EMAIL,
      passwordHash,
      role: "PLATFORM_ADMIN",
      onboardingCompletedAt: new Date(),
    },
  });

  console.log(`Platform Admin login ready: ${admin.email} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
