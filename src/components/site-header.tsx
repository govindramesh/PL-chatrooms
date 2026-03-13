import Link from "next/link";

type HeaderUser = {
  username: string;
  favoriteTeam: {
    name: string;
    shortName: string;
  };
};

type SiteHeaderProps = {
  user: HeaderUser;
  activePage?: "home" | "explore";
};

export function SiteHeader({ user, activePage }: SiteHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="space-y-1">
          <Link href="/home" className="text-xl font-semibold text-slate-900">
            PL Rooms
          </Link>
          <p className="text-xs text-slate-500">
            @{user.username} · {user.favoriteTeam.name}
          </p>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/home"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              activePage === "home"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Home
          </Link>
          <Link
            href="/explore"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              activePage === "explore"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Explore
          </Link>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
