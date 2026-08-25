import Link from "next/link";

import { listNotificationsForUser } from "@/lib/notifications";

export async function NotificationFeed({
  userId,
  variant = "coach",
}: {
  userId: string;
  variant?: "coach" | "athlete";
}) {
  const items = await listNotificationsForUser(userId, 8);
  if (items.length === 0) return null;

  const isAthlete = variant === "athlete";

  return (
    <section
      className={
        isAthlete
          ? "space-y-3 rounded-2xl border border-white/10 bg-zinc-900 p-4"
          : "rounded-2xl border border-brand/20 bg-white/90 p-4 shadow-sm sm:p-5"
      }
    >
      <h2
        className={
          isAthlete
            ? "font-heading text-xl font-bold text-white"
            : "font-heading text-lg font-bold text-slate-900"
        }
      >
        Notifications
      </h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const content = (
            <>
              <p
                className={
                  isAthlete
                    ? "text-sm font-semibold text-white"
                    : "text-sm font-semibold text-slate-900"
                }
              >
                {item.title}
              </p>
              {item.body ? (
                <p
                  className={
                    isAthlete
                      ? "text-xs text-slate-400"
                      : "text-xs text-slate-600"
                  }
                >
                  {item.body}
                </p>
              ) : null}
            </>
          );
          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={
                    isAthlete
                      ? "block rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5"
                      : "block rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                  }
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={
                    isAthlete
                      ? "rounded-xl border border-white/10 px-3 py-2"
                      : "rounded-lg border border-slate-100 px-3 py-2"
                  }
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
