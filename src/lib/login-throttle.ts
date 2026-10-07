/**
 * Freio para senha errada no login do app: 5 tentativas erradas em 15
 * minutos travam aquele e-mail por 15 minutos, contados da última. Fica na
 * memória da instância — não segura um ataque distribuído, mas acaba com o
 * chute em sequência.
 */

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

/** Quanto falta para destravar (ms); 0 se pode tentar. */
export function loginLockedFor(key: string, now = Date.now()): number {
  const list = recent(key, now);
  if (list.length < MAX_FAILURES) return 0;
  return WINDOW_MS - (now - list[list.length - 1]);
}

export function loginFailed(key: string, now = Date.now()): void {
  failures.set(key, [...recent(key, now), now]);
}

export function loginSucceeded(key: string): void {
  failures.delete(key);
}
