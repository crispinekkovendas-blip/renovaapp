import type { FlashTone } from "./flash.ts";

/**
 * Avisos que nascem no navegador (não de um redirect): quem chama dispara um
 * evento e o `FlashHost` do layout mostra, igual aos que vêm pela URL.
 */

export const FLASH_EVENT = "shinmed:aviso";

export interface FlashEvent {
  tone: FlashTone;
  text: string;
  /** O botão do aviso ("Desfazer"). Se a pessoa clicar, `onExpire` não roda. */
  action?: { label: string; run: () => void };
  /** Roda quando o aviso some sem o botão ter sido usado — é aí que o "excluir" acontece de verdade. */
  onExpire?: () => void;
}

export function showFlash(event: FlashEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FlashEvent>(FLASH_EVENT, { detail: event }));
}
