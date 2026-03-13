import Link from "next/link";

type HeaderUser = {
  username: string;
  favoriteTeam: {
    shortName: string;
  };
};

export function SiteHeader({ user }: { user: HeaderUser }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="space-y-1">
          <Link href="/home" className="text-xl font-semibold text-slate-900">
            PL Rooms
          </Link>
          <p className="text-xs text-slate-500">
            @{user.username} · Team {user.favoriteTeam.shortName}
          </p>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/home"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            href="/explore"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Explore
          </Link>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
