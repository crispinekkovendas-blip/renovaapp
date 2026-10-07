import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SideNav } from "@/components/app-shell/side-nav";
import { SectionTabs } from "@/components/app-shell/section-tabs";
import { MobileTopBar, MobileTabBar } from "@/components/app-shell/mobile-nav";

/**
 * O app da clínica veste o tema "à moda Mevo" (`theme-app` em globals.css):
 * barra lateral clara com rótulos, uma fonte geométrica só, roxo e rosa. A
 * landing e o portal do paciente ficam de fora do escopo e mantêm o visual
 * pinho e pêssego.
 *
 * Três larguras: no celular, barra no alto + abas fixas embaixo (o polegar
 * alcança); no tablet, trilho só de ícones; no desktop, a barra com rótulos.
 */
export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="theme-app flex min-h-dvh">
      <SideNav name={session.name} role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar name={session.name} />
        <SectionTabs />
        {/* No celular a barra de abas fica fixa embaixo: o conteúdo reserva a altura dela. */}
        <main className="min-w-0 flex-1 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:py-6 peek:pl-16 print:p-0">
          {children}
        </main>
      </div>
      <MobileTabBar name={session.name} role={session.role} />
      {modal}
    </div>
  );
}
