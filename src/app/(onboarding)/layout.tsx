export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="storefront-glass mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col">
      {children}
    </div>
  );
}
