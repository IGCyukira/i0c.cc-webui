import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/auth/config";
import { getRedirectConfig, listRedirectHistory, updateRedirectConfig } from "@/lib/github";

type SessionWithToken = Session & { accessToken: string };

async function requireSession(): Promise<SessionWithToken | null> {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session || typeof (session as Session & { accessToken?: unknown }).accessToken !== "string") {
    return null;
  }
  return session as SessionWithToken;
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [config, history] = await Promise.all([
      getRedirectConfig(session.accessToken),
      listRedirectHistory(session.accessToken, 10)
    ]);

    return NextResponse.json({ config, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const updateSchema = z.object({
  content: z.string().min(2, { message: "配置内容不能为空" }),
  sha: z.string().min(2, { message: "缺少配置版本信息" }),
  message: z.string().min(1).max(200).optional()
});

export async function PUT(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await updateRedirectConfig(session.accessToken, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
