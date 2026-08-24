import Image from "next/image";
import Link from "next/link";

import { brand } from "@/lib/brand";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
};

const markSizes = {
  sm: { width: 32, height: 32, className: "h-8 w-8" },
  md: { width: 36, height: 36, className: "h-9 w-9" },
  lg: { width: 40, height: 40, className: "h-10 w-10" },
};

export function BrandLogo({
  size = "md",
  showText = true,
  subtitle,
}: BrandLogoProps) {
  const mark = markSizes[size];

  return (
    <div className="flex items-center gap-2">
      <Image
        src={brand.logo.mark}
        alt={`${brand.name} logo`}
        width={mark.width}
        height={mark.height}
        className={`${mark.className} shrink-0 rounded-md object-cover`}
        priority
      />
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
    <Link href="/" className="inline-flex items-center">
      <Image
        src={brand.logo.full}
        alt={brand.name}
        width={220}
        height={220}
        className="h-16 w-auto object-contain sm:h-20"
        priority
      />
    </Link>
  );
}
