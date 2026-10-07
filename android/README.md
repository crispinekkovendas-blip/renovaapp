# Guia Renova — app Android

O Guia clínico do Renova (Receitas prontas, Plantão e emergência, Drive de
prescrições) como app nativo em Kotlin + Jetpack Compose, com a Super
Inteligência.

## Como funciona

- **Login**: a mesma conta do site, em `POST /api/app/login` → token de 30 dias,
  renovado a cada sincronização e guardado cifrado (Android Keystore).
- **Guia sem internet**: `GET /api/app/guia` entrega o guia inteiro num pacote
  (src/lib/app-bundle.ts) — marca-texto e histórico de cada trecho já prontos, a
  busca e o que cada revisão mudou. O app guarda o pacote e sincroniza ao abrir
  (304 quando nada mudou). Conta desativada → o app sai e apaga o guia.
- **Busca**: porte em Kotlin do motor do site (src/lib/smart-search.ts). O teste
  `SmartSearchGoldenTest` compara com o motor do site em ~80 consultas — mudou a
  busca lá, rode os testes aqui.
- **Super Inteligência**: pelo servidor (`POST /api/guia/perguntar` com o token);
  a chave do Gemini nunca vai ao aparelho. Citações abrem o trecho no app.
- **Mais**: favoritos e recentes, pergunta por voz, enviar/copiar receita
  (WhatsApp), aviso de revisão nova, modo escuro.

## Build

O GitHub Actions (`.github/workflows/android.yml`) faz tudo a cada push que mexe
no app ou no guia:

1. gera os arquivos de teste a partir do site (`npm run app:fixtures`);
2. roda os testes de unidade e monta o APK assinado (artefato `guia-renova-apk`);
3. liga um emulador (Android 14), roda o app de ponta a ponta contra um servidor
   falso e publica uma foto de cada tela (artefato `fotos-do-emulador`).

Para publicar o APK como release: Actions › "Android — Guia Renova" › Run
workflow › marcar "Publicar o APK". Ou: `gh workflow run android.yml -f publish=true --ref memed-fase-0`.

Na máquina (Android Studio ou linha de comando), na raiz do repositório:

```
npm run app:fixtures          # só para os testes
cd android && ./gradlew testDebugUnitTest assembleDebug
```

## Assinatura

A chave fica fora do repositório: `~/.renova-android/renova-guia.jks` (senha no
LEIA-ME.txt da mesma pasta) e nos segredos do GitHub `ANDROID_KEYSTORE_*`.
**Guarde uma cópia** — sem ela, uma versão nova não instala por cima da antiga.

O servidor que o app usa é `BuildConfig.API_BASE_URL` (produção).
