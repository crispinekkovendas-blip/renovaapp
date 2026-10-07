import { initialsOf } from "@/lib/clinic-public";

/** As iniciais do profissional num círculo na cor da agenda dele. */
export function BookingAvatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ${
        size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base"
      }`}
      style={{ backgroundColor: color || "#275145" }}
    >
      {initialsOf(name)}
    </span>
  );
}
