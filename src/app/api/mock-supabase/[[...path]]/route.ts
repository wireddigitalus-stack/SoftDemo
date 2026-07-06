import { NextRequest, NextResponse } from "next/server";
import { handleMockSupabaseRequest } from "@/lib/mock-db-handler";

async function handle(req: NextRequest) {
  const url = req.url;
  const method = req.method;
  
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  const bodyText = await req.text();

  // Route to the in-process mock db engine
  const res = await handleMockSupabaseRequest(url, method, headers, bodyText);

  if (res.status === 204) {
    return new NextResponse(null, {
      status: 204,
      statusText: "No Content",
      headers: res.headers,
    });
  }

  return NextResponse.json(res.body, {
    status: res.status,
    headers: res.headers,
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
