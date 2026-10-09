import { connection } from "next/server";

/** The deployment that's live now; open tabs compare it with the one they came from. */
export async function GET() {
  await connection();
  return Response.json(
    {
      deploymentId:
        process.env.NEXT_DEPLOYMENT_ID ||
        process.env.VERCEL_DEPLOYMENT_ID ||
        null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
