/** Short vibration feedback on devices that support it. Silent elsewhere and for reduced-motion users. */
export function haptic(kind: "tap" | "success" | "warning" = "tap") {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(kind === "success" ? [12, 40, 12] : kind === "warning" ? [30, 50, 30] : 10);
  } catch {
    /* vibration is a nicety, never an error */
  }
}
