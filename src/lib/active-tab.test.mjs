import assert from "node:assert/strict";
import { test } from "node:test";
import { activeSection, activeTab, visibleTabs } from "./active-tab.ts";

const MENU = [
  { href: "/dashboard" },
  {
    href: "/receituario",
    tabs: [
      { href: "/receituario", label: "Nova receita" },
      { href: "/receituario/historico", label: "Histórico" },
      { href: "/configuracoes/modelos", label: "Modelos" },
    ],
  },
  {
    href: "/whatsapp",
    tabs: [
      { href: "/whatsapp", label: "Conversas" },
      { href: "/whatsapp/simulador", label: "Simulador", secondary: true },
      { href: "/whatsapp/configurar", label: "Configurar" },
    ],
  },
  { href: "/configuracoes" },
];

test("a aba ativa é a de caminho mais longo que casa", () => {
  const tabs = MENU[1].tabs;
  assert.equal(activeTab("/receituario/historico", tabs).label, "Histórico");
  assert.equal(activeTab("/receituario", tabs).label, "Nova receita");
  assert.equal(activeTab("/configuracoes/modelos", tabs).label, "Modelos");
  assert.equal(activeTab("/agenda", tabs), undefined);
});

test("Modelos acende o Receituário, e o resto de Configurações continua em Configurações", () => {
  assert.equal(activeSection("/configuracoes/modelos", MENU).href, "/receituario");
  assert.equal(activeSection("/configuracoes/horarios", MENU).href, "/configuracoes");
  assert.equal(activeSection("/configuracoes", MENU).href, "/configuracoes");
});

test("quem não tem o Receituário no menu cai em Configurações, e caminho de fora não acende nada", () => {
  const semReceituario = MENU.filter((item) => item.href !== "/receituario");
  assert.equal(activeSection("/configuracoes/modelos", semReceituario).href, "/configuracoes");
  assert.equal(activeSection("/conta", MENU), undefined);
  // "/whatsappx" não é "/whatsapp": só casa o caminho inteiro ou um filho dele.
  assert.equal(activeSection("/whatsappx", MENU), undefined);
});

test("a aba rara só aparece enquanto se está nela", () => {
  const tabs = MENU[2].tabs;
  const labels = (current) => visibleTabs(tabs, current).map((tab) => tab.label);
  assert.deepEqual(labels("/whatsapp"), ["Conversas", "Configurar"]);
  assert.deepEqual(labels("/whatsapp/simulador"), ["Conversas", "Simulador", "Configurar"]);
  assert.deepEqual(labels(undefined), ["Conversas", "Configurar"]);
});
