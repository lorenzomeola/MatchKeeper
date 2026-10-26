export type PaymentMode = "free" | "paid" | "unavailable";

type PaymentModeQuery = {
  data: { value: unknown } | null;
  error: unknown;
};

export function resolvePaymentMode({
  data,
  error,
}: PaymentModeQuery): PaymentMode {
  if (error) return "unavailable";
  if (data === null) return "free";
  if (data.value === "false") return "free";
  if (data.value === "true") return "paid";
  return "unavailable";
}

export async function readPaymentMode(
  query: () => Promise<PaymentModeQuery>,
): Promise<{ mode: PaymentMode; error: unknown }> {
  try {
    const result = await query();
    return { mode: resolvePaymentMode(result), error: result.error };
  } catch (error) {
    return { mode: "unavailable", error };
  }
}
