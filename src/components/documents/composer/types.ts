import type { DocumentKind } from "@/lib/documents";
import type { ComposerItem, ComposerTemplate } from "@/lib/composer";

/** Tipos que o compositor (emit-composer.tsx) e o rail (composer-rail.tsx) compartilham. */

export interface ComposerProfessional {
  id: number;
  name: string;
  council: string;
  /** Tem assinatura digitalizada cadastrada (a folha sai assinada e carimbada). */
  hasSignature: boolean;
}

export interface ComposerPatient {
  name: string;
  social_name: string | null;
  cpf: string | null;
  phone: string | null;
  /** YYYY-MM-DD; o rail mostra a idade. */
  birth_date: string | null;
  /** Só para avisar quando o CID é classificado para outro sexo. */
  sex: string | null;
  /** "Uma por linha", como no cadastro; o rail mostra em chips e edita. */
  allergies: string | null;
  medications: string | null;
}

/** O que basta de um documento já emitido para "Renovar" (a linha de `documents`). */
export interface SeedableDocument {
  kind: DocumentKind;
  subkind: string | null;
  title: string;
  body: string;
  fields: string | null;
}

/** O que o rail pode fazer com a pilha. */
export interface ComposerActions {
  items: ComposerItem[];
  /** Acrescenta itens prontos (respeita o limite e não repete código). */
  appendItems(items: ComposerItem[]): void;
  /** "Renovar": um documento já emitido vira um item novo, com a data de hoje. */
  appendFromDocument(doc: SeedableDocument): void;
  /** Modelo comum → carrega o editor; protocolo → acrescenta todos os itens. */
  applyTemplate(template: ComposerTemplate): void;
  /** Abre o formulário "Salvar como protocolo" com a pilha atual. */
  openProtocolForm(): void;
}
