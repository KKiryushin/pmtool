import { auth, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">PM Competency Tool</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Signed in as {session?.user?.name} ({session?.user?.email}) — role:{" "}
        {session?.user?.role}
      </p>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
