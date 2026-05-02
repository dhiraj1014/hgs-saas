import Link from "next/link";
import { LogoMark } from "@/components/shared/logo-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4 py-10">
        <div className="w-full space-y-8">
          <Link href="/" className="flex flex-col items-center gap-3 text-center">
            <LogoMark size="xl" variant="shield" />
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Himalayan Global School
            </span>
            <span className="-mt-2 text-[11px] uppercase tracking-[0.22em] text-[#B26116]">
              Darkness to Light
            </span>
          </Link>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-rule">
            {children}
          </div>
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-mute">
            Byapur, Patna · Internal portal
          </p>
        </div>
      </div>
    </div>
  );
}
