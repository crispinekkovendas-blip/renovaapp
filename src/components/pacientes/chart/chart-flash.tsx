import { Feedback } from "@/components/feedback";
import { chartFlashMessages } from "./chart-model";

/** Avisos vindos das actions pela URL (?ok= / ?erro=), no alto da ficha. */
export function ChartFlash({ ok, erro }: { ok?: string; erro?: string }) {
  return chartFlashMessages(ok, erro).map((message) => (
    <Feedback key={message.text} tone={message.tone} className="mb-4">
      {message.text}
    </Feedback>
  ));
}
