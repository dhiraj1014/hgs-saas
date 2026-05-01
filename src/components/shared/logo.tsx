import Image from "next/image";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logos/logo.jpeg" alt="HGS" width={size} height={size} className="rounded" />
      <span className="font-display font-semibold text-ink">HGS Console</span>
    </div>
  );
}
