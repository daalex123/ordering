import { CustomerNav } from "@/components/customer/customer-nav";
import { OnboardingGate } from "@/components/customer/onboarding-gate";
import { OrderCompletedAlerts } from "@/components/customer/order-completed-alerts";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGate>
      <OrderCompletedAlerts />
      <div className="storefront-glass mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col pb-28">{children}</main>
        <CustomerNav />
      </div>
    </OnboardingGate>
  );
}
