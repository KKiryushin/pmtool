import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";

// Thin, generic CRUD handler factory for the admin API routes.
// Auth/role gating is enforced once in proxy.ts for all /api/admin/* paths,
// so these handlers don't re-check the session.
//
// `any` is used deliberately here: this file bridges Prisma's generated,
// per-model generic delegate types with a single generic handler factory.
// Each route.ts that calls these functions passes a concrete Prisma
// delegate and a concrete Zod schema, so real type safety still applies
// at every call site — only this shared plumbing is loosely typed.

type Delegate = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany: (args?: any) => Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (args: { data: any }) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (args: { where: { id: string }; data: any }) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (args: { where: { id: string } }) => Promise<any>;
};

export function listCreateHandlers(
  delegate: Delegate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchema: z.ZodObject<any>,
  listArgs?: Record<string, unknown>,
) {
  async function GET() {
    const items = await delegate.findMany(listArgs);
    return NextResponse.json(items);
  }

  async function POST(req: NextRequest) {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const created = await delegate.create({ data: parsed.data });
    return NextResponse.json(created, { status: 201 });
  }

  return { GET, POST };
}

export function itemHandlers(
  delegate: Delegate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSchema: z.ZodObject<any>,
) {
  async function PATCH(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = updateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const updated = await delegate.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  }

  async function DELETE(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) {
    const { id } = await ctx.params;
    await delegate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  return { PATCH, DELETE };
}
