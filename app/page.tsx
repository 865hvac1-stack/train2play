import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-emerald-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
            YT
          </div>
          <span className="text-lg font-semibold text-slate-900">
            Youth Athlete Training
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" render={<Link href="/login">Sign in</Link>} />
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            render={<Link href="/signup">Get started</Link>}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-10 md:pt-16">
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              Built for youth coaches
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Train smarter. Track progress. Build stronger seasons.
            </h1>
            <p className="text-lg leading-relaxed text-slate-600">
              A simple platform for coaches to manage athlete rosters, plan
              training, and keep every player on track — without spreadsheets
              or scattered notes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700"
                render={<Link href="/signup">Create free coach account</Link>}
              />
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/login">Sign in</Link>}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              What you can do today
            </h2>
            <ul className="space-y-4">
              {[
                "Create a secure coach account",
                "Build and manage your athlete roster",
                "Store sport, position, and athlete notes",
                "View a dashboard overview of your team",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              Demo login: <strong>coach@example.com</strong> /{" "}
              <strong>password123</strong>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
