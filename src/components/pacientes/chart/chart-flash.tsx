import { Feedback } from "@/components/feedback";
import { chartFlashMessages } from "./chart-model";

/** Avisos da ficha vindos das actions pela URL (?ok= / ?erro=), no canto de avisos do app. */
export function ChartFlash({ ok, erro }: { ok?: string; erro?: string }) {
  return chartFlashMessages(ok, erro).map((message) => (
    <Feedback key={message.text} tone={message.tone} floating>
      {message.text}
    </Feedback>
  ));
}
