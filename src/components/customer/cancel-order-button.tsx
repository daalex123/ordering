"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();

  async function cancel() {
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("status", "pending");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order cancelled");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="glass-panel w-full rounded-[20px] py-3 text-[15px] font-semibold text-white"
      onClick={cancel}
    >
      Cancel order
    </button>
  );
}
