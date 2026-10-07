"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { subscribePushAction, unsubscribePushAction } from "@/lib/actions-push";
import { APP_TZ, HUB_TOKEN_KEY, applicationServerKey, isIos, readTokenExpiry } from "@/lib/push";

/**
 * A camada "app" do portal do paciente: guarda o link no aparelho (para o
 * ícone da tela de início reabri-lo), registra o service worker e oferece os
 * lembretes por push. Tudo aqui depende de JS por natureza — sem JS o card
 * simplesmente não existe, e o portal continua inteiro.
 *
 * O portal desenha o próprio rodapé dentro do `<main>`; para o card ficar no
 * fim do conteúdo (e não depois do rodapé), ele é portado para
 * `#hub-pwa-slot` se a página oferecer um, senão para logo antes de
 * `main > footer`. Sem nenhum dos dois, renderiza no lugar.
 */

type Support = "checking" | "ready" | "ios-install" | "none";
type PushState = "idle" | "busy" | "subscribed" | "denied" | "error" | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function todaySaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

export function HubPwa({ token }: { token: string }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [support, setSupport] = useState<Support>("checking");
  const [state, setState] = useState<PushState>("idle");
  // O que falhou de verdade (nome do erro do navegador ou resposta do servidor):
  // sem isso o card só diz "não deu certo" e ninguém consegue investigar.
  const [detail, setDetail] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const subscriptionRef = useRef<PushSubscription | null>(null);

  // Sem segredo no cliente: só a validade. Link vencido não é guardado nem
  // ganha o card — o servidor é quem autoriza de verdade.
  const tokenUsable = useMemo(() => {
    const parsed = readTokenExpiry(token);
    return Boolean(parsed && parsed.expiresAt >= todaySaoPaulo());
  }, [token]);

  // Onde o card entra no DOM (ver comentário do arquivo).
  useEffect(() => {
    const slot = document.getElementById("hub-pwa-slot");
    if (slot) {
      setMount(slot);
      return;
    }
    const footer = document.querySelector("main > footer");
    if (!footer?.parentElement) return;
    const host = document.createElement("div");
    host.className = "mx-auto max-w-md px-4 pb-4 sm:px-6";
    footer.parentElement.insertBefore(host, footer);
    setMount(host);
    return () => host.remove();
  }, []);

  useEffect(() => {
    if (!tokenUsable) {
      setSupport("none");
      return;
    }
    try {
      localStorage.setItem(HUB_TOKEN_KEY, token);
    } catch {
      // Navegação privada ou armazenamento bloqueado: o portal funciona igual.
    }

    const onIos = isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    setIos(onIos);
    setStandalone(isStandaloneDisplay());

    const hasSw = "serviceWorker" in navigator;
    const hasPush = hasSw && "PushManager" in window && "Notification" in window;

    if (hasSw) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(async (registration) => {
          if (!hasPush) return;
          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            subscriptionRef.current = existing;
            setState("subscribed");
          }
        })
        .catch(() => {
          // Sem service worker não há push; o card avisa quando o paciente tentar.
        });
    }

    if (!hasPush) {
      // iOS só libera push depois de instalar: vale explicar em vez de esconder.
      setSupport(onIos && !isStandaloneDisplay() ? "ios-install" : "none");
    } else {
      setSupport("ready");
      if (Notification.permission === "denied") setState("denied");
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [token, tokenUsable]);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setState("unavailable");
      return;
    }
    setState("busy");
    setDetail(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }
      // `ready` espera o worker ativar — `subscribe` falha num worker ainda instalando.
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      const result = await subscribePushAction(token, subscription.toJSON(), navigator.userAgent);
      if (!result.ok) {
        // O servidor não guardou: não deixa o navegador com uma assinatura órfã.
        await subscription.unsubscribe().catch(() => undefined);
        setDetail(`servidor: ${result.error}${result.detail ? ` (${result.detail})` : ""}`);
        setState(result.error === "indisponivel" ? "unavailable" : "error");
        return;
      }
      subscriptionRef.current = subscription;
      setState("subscribed");
    } catch (error) {
      setDetail(describeError(error));
      setState("error");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = subscriptionRef.current ?? (await registration.pushManager.getSubscription());
      if (subscription) {
        await unsubscribePushAction(token, subscription.endpoint);
        await subscription.unsubscribe().catch(() => undefined);
      }
      subscriptionRef.current = null;
      setState("idle");
    } catch (error) {
      setDetail(describeError(error));
      setState("error");
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  }

  if (support === "checking" || support === "none") return null;

  const card = (
    <section className="card mt-2 p-4 sm:p-5" aria-labelledby="hub-pwa-title">
      <p className="label">Lembretes</p>
      <h2 id="hub-pwa-title" className="mt-1 font-display text-xl font-semibold leading-tight tracking-tight text-pine-950">
        Receber lembretes neste celular
      </h2>
      <p className="mt-1.5 text-sm text-pine-900/60">
        Na véspera da consulta, um aviso aparece aqui — sem depender do WhatsApp.
      </p>

      <div className="mt-4">
        {support === "ios-install" ? (
          <Note>
            No iPhone, os avisos só funcionam depois de adicionar o portal à Tela de Início: no Safari,
            toque em <strong>Compartilhar</strong> e depois em <strong>“Adicionar à Tela de Início”</strong>.
            Depois, abra pelo ícone e ative os lembretes por aqui.
          </Note>
        ) : state === "subscribed" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="chip bg-emerald-100 text-emerald-800">Lembretes ativados ✓</span>
              <p className="mt-2 text-xs text-pine-900/55">O aviso da próxima consulta chega neste aparelho.</p>
            </div>
            <button type="button" className="btn btn-outline w-full sm:w-auto" onClick={disable}>
              Desativar
            </button>
          </div>
        ) : state === "denied" ? (
          <Note>
            Você bloqueou os avisos deste site. Para liberar, abra as configurações do navegador, permita as
            notificações e volte aqui.
          </Note>
        ) : state === "unavailable" ? (
          <Note>
            Os lembretes automáticos ainda não estão disponíveis nesta clínica. Por enquanto, o aviso continua
            chegando pelo WhatsApp.
          </Note>
        ) : (
          <>
            {state === "error" ? (
              <p className="mb-3 text-sm font-semibold text-rose-700" role="status">
                Não deu certo agora. Tente de novo em instantes.
                {detail ? (
                  <span className="mt-1 block break-words text-xs font-normal text-rose-700/80">
                    Detalhe: {detail}
                  </span>
                ) : null}
              </p>
            ) : null}
            <button type="button" className="btn-hero w-full" onClick={enable} disabled={state === "busy"}>
              {state === "busy" ? "Um instante…" : "Ativar lembretes"}
              <span className="chev" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {!standalone && support !== "ios-install" ? (
        <div className="mt-4 border-t border-pine-900/10 pt-3 text-xs text-pine-900/55">
          {installEvent ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Quer abrir o portal como um app, direto da tela de início?</span>
              <button type="button" className="btn btn-outline w-full sm:w-auto" onClick={install}>
                Instalar
              </button>
            </div>
          ) : ios ? (
            <span>
              Para ter o portal na tela de início: no Safari, toque em <strong>Compartilhar</strong> e em{" "}
              <strong>“Adicionar à Tela de Início”</strong>.
            </span>
          ) : (
            <span>
              Dá para adicionar o portal à tela de início pelo menu do navegador (“Instalar app” ou “Adicionar
              à tela inicial”).
            </span>
          )}
        </div>
      ) : null}
    </section>
  );

  if (mount) return createPortal(card, mount);
  return <div className="mx-auto max-w-md px-4 pb-8 sm:px-6">{card}</div>;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 200);
  return String(error).slice(0, 200);
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-pine-50 px-4 py-3 text-sm leading-relaxed text-pine-900/70">{children}</p>;
}
