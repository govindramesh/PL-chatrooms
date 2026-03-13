import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
  });

  const { error } = await searchParams;

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Create your PL Rooms account</h1>
      <p className="mb-6 text-sm text-slate-600">
        Choose one team at signup. That team decides which team chats you can access.
      </p>
      {error ? <p className="mb-4 rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      <form method="post" action="/api/auth/signup" className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-700 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-700 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-700 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="favoriteTeamId">
            Your Team
          </label>
          <select
            id="favoriteTeamId"
            name="favoriteTeamId"
            required
            defaultValue=""
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-700 focus:outline-none"
          >
            <option value="" disabled>
              Select a team
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Sign up
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Login
        </Link>
      </p>
    </section>
  );
}
