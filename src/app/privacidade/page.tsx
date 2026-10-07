import type { Metadata } from "next";
import { getPublicClinic, publicMetadata } from "@/lib/marketing-stats";
import { telHref } from "@/lib/clinic-public";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getPublicClinic();
  return publicMetadata({
    title: "Política de privacidade",
    description: `Como a ${name} trata os seus dados pessoais, conforme a LGPD (Lei nº 13.709/2018).`,
    path: "/privacidade",
  });
}

/**
 * Página pública. O nome e os contatos da clínica vêm de `settings`; sem
 * banco, a página ainda abre com o nome genérico e sem contatos.
 */
export default async function PrivacyPage() {
  const { name: clinic, phone, address, document } = await getPublicClinic();
  const tel = telHref(phone);

  return (
    <>
      <SiteHeader clinicName={clinic} width="max-w-2xl" />
      <main className="bg-paper px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <article className="mx-auto max-w-2xl space-y-8 text-base leading-relaxed text-pine-900/80">
          <header>
            <h1 className="break-words font-display text-4xl font-semibold tracking-tight text-pine-950">Política de privacidade</h1>
            <p className="mt-2 text-xs text-pine-900/50">
              Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
            </p>
          </header>

          <section>
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-pine-950">Quem trata os seus dados</h2>
            <p>
              <strong>{clinic}</strong> é a controladora dos dados pessoais coletados por este sistema. O
              Renova é o software usado pela clínica para agenda, cadastro de pacientes e prontuário.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-pine-950">Quais dados e para quê</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Agendamento online:</strong> nome, telefone e e-mail — para marcar a consulta e
                confirmá-la por WhatsApp.
              </li>
              <li>
                <strong>Cadastro e atendimento:</strong> CPF, data de nascimento, sexo, convênio e as
                anotações clínicas do atendimento — para prestar o cuidado de saúde e emitir documentos
                (receitas, atestados, cobranças).
              </li>
            </ul>
            <p className="mt-2">
              Dados de saúde são <strong>dados pessoais sensíveis</strong>. Eles são tratados com base na
              tutela da saúde, em procedimento realizado por profissionais da área (art. 11, II, f da LGPD),
              e nunca são usados para outra finalidade.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-pine-950">Com quem os dados são compartilhados</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Prescrição digital:</strong> quando a clínica emite receita digital assinada, nome,
                CPF, sexo, data de nascimento, telefone e e-mail do paciente são enviados à Memed, operadora
                estabelecida no Brasil, exclusivamente para gerar e assinar a receita.
              </li>
              <li>
                <strong>Infraestrutura:</strong> os dados ficam armazenados em banco de dados hospedado no
                Brasil (região São Paulo), com acesso restrito à aplicação.
              </li>
            </ul>
            <p className="mt-2">Os dados não são vendidos nem cedidos para publicidade.</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-pine-950">Por quanto tempo</h2>
            <p>
              Registros clínicos são mantidos pelo prazo exigido pela regulamentação profissional (o
              prontuário médico tem guarda mínima de 20 anos, conforme o CFM). Dados de agendamento sem
              atendimento realizado podem ser apagados a pedido.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-pine-950">Seus direitos</h2>
            <p>
              Você pode pedir à clínica a confirmação do tratamento, o acesso, a correção e, quando cabível,
              a eliminação dos seus dados, além de informação sobre com quem foram compartilhados. O pedido
              é feito diretamente à clínica, pelos canais de contato informados no agendamento.
            </p>
          </section>

          {tel || address || document ? (
            <section>
              <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-pine-950">Contato da clínica</h2>
              <address className="not-italic">
                <p className="font-bold text-pine-950">{clinic}</p>
                {document ? <p>CNPJ {document}</p> : null}
                {address ? <p>{address}</p> : null}
                {tel && phone ? (
                  <p>
                    <a href={tel} className="font-bold text-pine-700 underline underline-offset-2">
                      {phone}
                    </a>
                  </p>
                ) : null}
              </address>
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter clinicName={clinic} compact />
    </>
  );
}
