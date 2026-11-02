import PHOTOS from "./medication-photos.json" with { type: "json" };
import { searchKey } from "./normalize.ts";

/**
 * Fotos reais de medicamentos, por nome comercial.
 *
 * Todas vêm do **Wikimedia Commons**, só com licença que permite uso
 * comercial (domínio público, CC0, CC BY, CC BY-SA), escolhidas por
 * `scripts/medication-photos/` e conferidas uma a uma antes de entrar. As
 * miniaturas ficam em `public/medicamentos/fotos/`; o crédito (autor,
 * licença, página do arquivo) é obrigatório nas licenças CC BY e aparece no
 * `title` da foto e em Ajuda › Créditos das fotos.
 *
 * Muitas são de embalagens de outros países: a foto ajuda a reconhecer o
 * remédio, não substitui a apresentação da ANVISA.
 */
export interface MedicationPhoto {
  /** Nome comercial como aparece na lista ("Rivotril"). */
  brand: string;
  /** Caminho público da miniatura. */
  src: string;
  author: string | null;
  license: string;
  licenseUrl: string | null;
  /** Página do arquivo no Commons. */
  page: string;
}

const BY_KEY = PHOTOS as Record<string, MedicationPhoto>;

/** A foto da primeira marca da lista que tiver uma (a lista já vem da mais comum à menos). */
export function photoForBrands(brands: readonly string[] | null | undefined): MedicationPhoto | null {
  for (const brand of brands ?? []) {
    const photo = BY_KEY[searchKey(brand)];
    if (photo) return photo;
  }
  return null;
}

/** "Foto: Fulano, CC BY-SA 4.0 — Wikimedia Commons" */
export function photoCredit(photo: MedicationPhoto): string {
  return `Foto: ${photo.author ? `${photo.author}, ` : ""}${photo.license} — Wikimedia Commons`;
}

/** Todas, em ordem alfabética, para a página de créditos. */
export function allPhotos(): MedicationPhoto[] {
  return Object.values(BY_KEY).sort((a, b) => a.brand.localeCompare(b.brand, "pt-BR"));
}
