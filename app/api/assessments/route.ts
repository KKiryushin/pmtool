import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/assessments/access";

const createSchema = z.object({
  frameworkId: z.string().min(1),
  levelId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status");

  const assessments = await prisma.assessment.findMany({
    where: {
      OR: [{ subjectUserId: session.user.id }, { assessorUserId: session.user.id }],
      ...(status ? { status: status as "DRAFT" | "SUBMITTED" } : {}),
    },
    include: { framework: true, level: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assessments);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const level = await prisma.level.findUnique({ where: { id: parsed.data.levelId } });
  if (!level || level.frameworkId !== parsed.data.frameworkId) {
    return NextResponse.json({ error: "Level does not belong to framework" }, { status: 400 });
  }

  const assessment = await prisma.assessment.create({
    data: {
      frameworkId: parsed.data.frameworkId,
      levelId: parsed.data.levelId,
      subjectUserId: session.user.id,
      assessorUserId: session.user.id,
      assessorRole: "SELF",
      status: "DRAFT",
    },
  });

  return NextResponse.json(assessment, { status: 201 });
}
