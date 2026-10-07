import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Os APKs do app Android (Guia Renova) que o site entrega. Ao publicar
 * (`gh workflow run android.yml -f publish=true`), o GitHub Actions cria a
 * release e também grava o APK em `android-releases/` com a lista
 * `releases.json` — commit no `memed-fase-0` (guarda as 3 mais novas). O
 * site lê dali: APK novo chega à produção com o próximo deploy. Sem token do
 * GitHub (o repositório é privado).
 */

export const RELEASES_DIR = path.join(process.cwd(), "android-releases");

export interface ApkRelease {
  /** "1.0.13" */
  version: string;
  publishedAt: string;
  fileName: string;
  size: number;
}

function versionKey(v: string): number[] {
  return v.split(".").map((n) => Number(n) || 0);
}

/** A lista de `releases.json`, da mais nova para a mais velha; ignora entrada malformada. */
export function parseReleases(raw: unknown): ApkRelease[] {
  if (!Array.isArray(raw)) return [];
  const out = raw.filter(
    (r): r is ApkRelease =>
      !!r &&
      typeof r.version === "string" &&
      /^\d+(\.\d+)*$/.test(r.version) &&
      typeof r.fileName === "string" &&
      /^[\w.-]+\.apk$/.test(r.fileName)
  );
  return out
    .map((r) => ({ version: r.version, publishedAt: typeof r.publishedAt === "string" ? r.publishedAt : "", fileName: r.fileName, size: typeof r.size === "number" ? r.size : 0 }))
    .sort((a, b) => {
      const [x, y] = [versionKey(a.version), versionKey(b.version)];
      for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
      return 0;
    });
}

/** Os APKs que este deploy tem (vazio se a pasta ainda não existe). */
export function apkReleases(): ApkRelease[] {
  try {
    return parseReleases(JSON.parse(readFileSync(path.join(RELEASES_DIR, "releases.json"), "utf8")));
  } catch {
    return [];
  }
}

/** O arquivo de uma versão; `null` se não está neste deploy. */
export function apkFile(release: ApkRelease): Buffer | null {
  try {
    return readFileSync(path.join(RELEASES_DIR, release.fileName));
  } catch {
    return null;
  }
}
