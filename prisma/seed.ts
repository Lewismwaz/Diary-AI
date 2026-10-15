import "dotenv/config";

async function main() {
  console.log(
    "Seed complete. Database intentionally left empty."
  );
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});