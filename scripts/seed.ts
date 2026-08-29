import { seedDatabase } from "../src/lib/db/seed";

seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed database failed:", err);
    process.exit(1);
  });
