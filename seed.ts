import { prisma } from "@lib/db";
import bcrypt from "bcrypt";

async function main() {
  const email = "admin@example.com";
  const password = "admin123";
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", password_hash: hash },
  });

  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const experiment = await prisma.experiment.upsert({
    where: { slug: "exemplo" },
    update: {},
    create: {
      slug: "exemplo",
      start_at: start,
      end_at: end,
      status: "running",
      entry_url: "https://example.com/landing?a=1",
      variants: {
        create: [
          { name: "A", url: "https://example.com/landing?a=1", weight: 50, is_active: true },
          { name: "B", url: "https://example.com/landing?b=1", weight: 50, is_active: true },
        ],
      },
    },
    include: { variants: true },
  });

  console.log("Seeded user:", user.email);
  console.log("Experiment:", experiment.slug, "variants:", experiment.variants.map(v=>v.name).join(","));
}

main().then(()=>process.exit(0)).catch((e)=>{console.error(e); process.exit(1);});
