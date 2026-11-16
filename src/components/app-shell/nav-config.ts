import type { ComponentType, SVGProps } from "react";
import type { Role } from "@/lib/db";
import {
  IconBook,
  IconCalendar,
  IconChat,
  IconFileText,
  IconHome,
  IconRx,
  IconSettings,
  IconUsers,
  IconWallet,
} from "@/components/icons";

import { activeSection, activeTab, visibleTabs } from "@/lib/active-tab";
import type { NavTab } from "@/lib/active-tab";

export { activeTab, visibleTabs };
export type { NavTab };

export interface NavItem {
  href: string;
  label: string;
  /** Rótulo curto da barra de abas do celular (cabe em ~70px). */
  short?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Perfis que podem ver e acessar a seção. Sempre explícito — nada é liberado por omissão. */
  roles: Role[];
  tabs?: NavTab[];
  /**
   * "gestao": o que se usa para tocar a clínica, não para atender (Financeiro,
   * Relatórios, Configurações). Vai num segundo bloco do menu, depois de um fio.
   */
  group?: "gestao";
}

const TODOS: Role[] = ["admin", "recepcao", "profissional"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: IconHome, roles: TODOS },
  {
    href: "/agenda",
    label: "Agenda",
    icon: IconCalendar,
    roles: TODOS,
    tabs: [
      { href: "/agenda", label: "Dia" },
      { href: "/agenda/semana", label: "Semana" },
      { href: "/agenda/lembretes", label: "Lembretes" },
      { href: "/agenda/retornos", label: "Retornos" },
    ],
  },
  {
    href: "/pacientes",
    label: "Meus pacientes",
    short: "Pacientes",
    icon: IconUsers,
    roles: TODOS,
  },
  // Receitas fora da ficha: escolher o paciente, histórico, renovações de uso contínuo
  // e o que mais se receita. Quem emite documento médico: profissional e admin.
  {
    href: "/receituario",
    label: "Receituário",
    short: "Receitas",
    icon: IconRx,
    roles: ["admin", "profissional"],
    tabs: [
      { href: "/receituario", label: "Nova receita" },
      { href: "/receituario/historico", label: "Histórico" },
      { href: "/receituario/renovacoes", label: "Renovações" },
      { href: "/receituario/mais-receitados", label: "Mais receitados" },
      // Modelos de documento e protocolos de medicamento: a página mora em
      // Configurações, mas quem usa é quem prescreve — por isso a aba fica aqui
      // (antes era um item do menu, "Personalize seus modelos").
      { href: "/configuracoes/modelos", label: "Modelos" },
    ],
  },
  // Triagem e teleconsulta pelo WhatsApp: dado de saúde, então médico e admin.
  {
    href: "/whatsapp",
    label: "WhatsApp",
    icon: IconChat,
    roles: ["admin", "profissional"],
    tabs: [
      { href: "/whatsapp", label: "Conversas" },
      { href: "/whatsapp/simulador", label: "Simulador", secondary: true },
      { href: "/whatsapp/configurar", label: "Configurar" },
    ],
  },
  // Consulta clínica, de quem prescreve: duas áreas — o Plantão (receitas prontas,
  // emergência e Drive, com a busca única) e a Ortopedia. O app Android é aba rara.
  {
    href: "/guia",
    label: "Guia clínico",
    short: "Guia",
    icon: IconBook,
    roles: ["admin", "profissional"],
    tabs: [
      { href: "/guia", label: "Plantão" },
      { href: "/guia/ortopedia", label: "Ortopedia" },
      { href: "/guia/app", label: "App Android", secondary: true },
    ],
  },
  // ── Gestão: daqui para baixo é o segundo bloco do menu ──
  {
    // Recepção cobra e recebe no balcão, então mantém Financeiro.
    href: "/financeiro",
    label: "Financeiro",
    icon: IconWallet,
    roles: ["admin", "recepcao"],
    group: "gestao",
    tabs: [
      { href: "/financeiro", label: "Pagamentos" },
      { href: "/financeiro/convenios", label: "Convênios" },
    ],
  },
  // Relatórios e Configurações são gestão — só admin.
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: IconFileText,
    roles: ["admin"],
    group: "gestao",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    short: "Ajustes",
    icon: IconSettings,
    roles: ["admin"],
    group: "gestao",
  },
];

/**
 * A seção ativa é a de caminho mais longo que casa com a URL, contando as abas:
 * em `/configuracoes/modelos` acende Receituário (Modelos é aba dele), não Configurações.
 */
export function activeNavItem(pathname: string, items: NavItem[] = NAV_ITEMS): NavItem | undefined {
  return activeSection(pathname, items);
}

/** Onde o segundo bloco do menu (gestão) começa — é ali que entra o fio. -1: não há, ou o menu é só ele. */
export function managementStart(items: readonly NavItem[]): number {
  const index = items.findIndex((item) => item.group === "gestao");
  return index > 0 ? index : -1;
}

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
