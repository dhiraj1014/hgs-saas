export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-rule">
        {children}
      </div>
    </main>
  );
}
