import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    const seedPath = path.join(process.cwd(), "supabase", "mock-db-seed.json");
    const dbPath = path.join(process.cwd(), "supabase", "mock-db.json");

    if (!fs.existsSync(seedPath)) {
      return NextResponse.json(
        { error: "Seed file not found. Cannot reset demo data." },
        { status: 500 }
      );
    }

    const seedData = fs.readFileSync(seedPath, "utf8");
    fs.writeFileSync(dbPath, seedData, "utf8");

    return NextResponse.json({
      success: true,
      message: "Demo data has been reset to factory state.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Demo Reset] Error:", err);
    return NextResponse.json(
      { error: "Failed to reset demo data." },
      { status: 500 }
    );
  }
}
