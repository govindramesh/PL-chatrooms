import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  const { error } = await searchParams;

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Login to PL Rooms</h1>
      <p className="mb-6 text-sm text-slate-600">Join match chats by your favorite Premier League team.</p>
      {error ? <p className="mb-4 rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      <form method="post" action="/api/auth/login" className="space-y-3">
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-700 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Login
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-slate-900 underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
