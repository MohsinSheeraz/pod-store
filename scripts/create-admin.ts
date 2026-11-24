// Creates an admin account, or makes an existing account an admin and sets its password.
//   npm run admin:create -- you@example.com "a long passphrase here"
// Use this to replace the old test admin before going live.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [emailArg, password] = process.argv.slice(2);
  const email = (emailArg ?? "").trim().toLowerCase();

  if (!email || !email.includes("@") || !password) {
    console.error('Usage: npm run admin:create -- <email> "<password>"');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Use a password of at least 12 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: "ADMIN", emailVerified: new Date() },
    create: { name: "Admin", email, password: hash, role: "ADMIN", emailVerified: new Date() },
  });
  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
