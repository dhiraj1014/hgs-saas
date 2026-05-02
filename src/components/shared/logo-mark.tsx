import Image from "next/image";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

const dim: Record<Size, number> = { sm: 28, md: 36, lg: 56, xl: 96 };

export function LogoMark({
  size = "md",
  variant = "shield",
  className,
}: {
  size?: Size;
  /** "shield" = compact transparent shield. "horizontal" = shield + wordmark beside it. */
  variant?: "shield" | "horizontal";
  className?: string;
}) {
  if (variant === "horizontal") {
    const h = dim[size];
    return (
      <Image
        src="/logos/logo-horizontal.png"
        alt="Himalayan Global School — Darkness to Light"
        width={Math.round(h * 6)}
        height={h}
        priority
        className={cn("h-auto w-auto object-contain", className)}
        style={{ maxHeight: h }}
      />
    );
  }
  const px = dim[size];
  return (
    <Image
      src="/logos/logo-transparent.png"
      alt="Himalayan Global School"
      width={px}
      height={px}
      priority
      className={cn("object-contain", className)}
    />
  );
}
