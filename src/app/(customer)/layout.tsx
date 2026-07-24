import { CustomerNav } from "@/components/customer/customer-nav";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col bg-background">
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <CustomerNav />
    </div>
  );
}
