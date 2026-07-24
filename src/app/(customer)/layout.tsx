import { CustomerNav } from "@/components/customer/customer-nav";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col bg-[#F5CB58]">
      <main className="flex min-h-0 flex-1 flex-col pb-24">{children}</main>
      <CustomerNav />
    </div>
  );
}
