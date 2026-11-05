import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scalePointSchema } from "@/lib/admin/schemas";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const points = await prisma.scalePoint.findMany({
    where: { scaleId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(points);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = scalePointSchema.safeParse({ ...body, scaleId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const created = await prisma.scalePoint.create({ data: parsed.data });
  return NextResponse.json(created, { status: 201 });
}
