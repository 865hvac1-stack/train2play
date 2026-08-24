import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OnboardingChecklistProps = {
  steps: {
    id: string;
    label: string;
    href: string;
    done: boolean;
  }[];
};

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const completed = steps.filter((step) => step.done).length;
  const allDone = completed === steps.length;

  if (allDone) {
    return null;
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader>
        <CardTitle>Get started checklist</CardTitle>
        <CardDescription>
          {completed} of {steps.length} complete — finish these to set up your
          program.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-white px-4 py-3 transition-colors hover:bg-emerald-50"
          >
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-slate-300" />
            )}
            <span
              className={
                step.done
                  ? "text-sm text-slate-500 line-through"
                  : "text-sm font-medium text-slate-900"
              }
            >
              {step.label}
            </span>
          </Link>
        ))}
        <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/athletes/new">Continue setup</Link>}
        />
      </CardContent>
    </Card>
  );
}
