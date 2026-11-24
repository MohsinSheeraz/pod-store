// Takes admin rights away from an account (for example the old test admin).
//   npm run admin:demote -- admin@pressroom.test
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:demote -- <email>");
    process.exit(1);
  }
  const { count } = await prisma.user.updateMany({ where: { email }, data: { role: "CUSTOMER" } });
  console.log(count ? `${email} is now a regular customer.` : `No account found for ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
