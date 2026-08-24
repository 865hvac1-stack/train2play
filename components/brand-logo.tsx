import { brand } from "@/lib/brand";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-10 w-10 text-sm",
};

export function BrandLogo({
  size = "md",
  showText = true,
  subtitle,
}: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white ${sizeClasses[size]}`}
      >
        {brand.monogram}
      </div>
      {showText ? (
        <div>
          <p className="text-sm font-semibold text-slate-900">{brand.shortName}</p>
          {subtitle ? (
            <p className="text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function BrandLogoLarge() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
        {brand.monogram}
      </div>
      <span className="text-lg font-semibold text-slate-900">{brand.name}</span>
    </div>
  );
}
