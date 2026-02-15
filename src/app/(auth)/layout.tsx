export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md px-4">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Spill
        </h1>
        {children}
      </div>
    </div>
  );
}
