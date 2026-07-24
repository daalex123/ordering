export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col">
      {children}
    </div>
  );
}
