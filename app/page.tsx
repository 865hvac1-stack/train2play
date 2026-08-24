export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-emerald-50 px-6">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-lg">
          YT
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Youth Athlete Training
          </h1>
          <p className="text-lg leading-relaxed text-slate-600">
            Your training platform is being set up. Coaches and athletes will
            use this app to plan workouts, track progress, and build stronger
            seasons together.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-800">
            Development server is running
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Feature development starts in the next phase.
          </p>
        </div>
      </main>
    </div>
  );
}
