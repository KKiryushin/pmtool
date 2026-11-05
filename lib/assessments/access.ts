import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Assessment } from "@prisma/client";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

/** An assessment is accessible to its subject, its assessor, or an admin. */
export function canAccessAssessment(
  assessment: Assessment,
  userId: string,
  role: string,
) {
  return (
    role === "ADMIN" ||
    assessment.subjectUserId === userId ||
    assessment.assessorUserId === userId
  );
}

export async function loadOwnedAssessment(id: string, userId: string, role: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return { assessment: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!canAccessAssessment(assessment, userId, role)) {
    return { assessment: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { assessment, error: null };
}
