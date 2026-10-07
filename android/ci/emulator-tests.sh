#!/usr/bin/env bash
# Roda o teste de ponta a ponta no emulador e traz as fotos de cada tela.
# Depois, o APK de release (minificado pelo R8): instala, abre e confere que não fecha sozinho.
set -u
# Emulador lento de CI: aviso de "não está respondendo" do sistema não deve cobrir as fotos.
adb shell settings put global hide_error_dialogs 1 || true
adb shell rm -rf /sdcard/Download/renova
adb shell mkdir -p /sdcard/Download/renova
gradle --no-daemon connectedDebugAndroidTest
status=$?

adb uninstall br.com.renova.guia >/dev/null 2>&1 || true
if adb install -r app/build/outputs/apk/release/app-release.apk; then
  adb logcat -c || true
  adb shell am start -W -n br.com.renova.guia/.MainActivity
  sleep 12
  adb shell screencap -p /sdcard/Download/renova/00-release-abre.png
  if [ -z "$(adb shell pidof br.com.renova.guia | tr -d '\r')" ]; then
    echo "::error::O APK de release fechou ao abrir."
    adb logcat -d -v time > release-crash.txt || true
    status=1
  else
    echo "APK de release abriu e continua rodando."
  fi
else
  echo "::error::Não consegui instalar o APK de release."
  status=1
fi

mkdir -p screenshots
adb pull /sdcard/Download/renova/. screenshots/ || true
adb logcat -d -v time > screenshots/logcat.txt || true
[ -f release-crash.txt ] && mv release-crash.txt screenshots/
exit $status
