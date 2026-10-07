// Roda no `npm install` (script "prepare"): aponta o git para os hooks do
// repo, para o pre-push que bloqueia push direto em master valer em qualquer
// clone — `core.hooksPath` é config local e não viaja com o clone.
// Em CI/Vercel não há o que proteger; sai sem tocar em nada.
import { execSync } from "node:child_process";

if (process.env.CI || process.env.VERCEL) process.exit(0);

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  // Sem git (tarball, cópia solta) não há hook a instalar.
}
