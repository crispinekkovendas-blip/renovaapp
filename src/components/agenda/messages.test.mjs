import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmMessage, reminderMessage, telemedMessage, telemedRoomUrl } from "./messages.ts";

const appt = {
  patient_name: "Maria da Silva",
  professional_name: "Dra. Ana",
  date: "2026-09-24",
  start_time: "14:30",
};

test("confirmMessage leva data, hora, profissional e o link", () => {
  assert.equal(
    confirmMessage(appt, "https://x/confirmar/abc"),
    "Olá Maria da Silva! Confirmando sua consulta na Clínica Renova em 24/09/2026 às 14:30 com Dra. Ana. Responda SIM ou confirme pelo link: https://x/confirmar/abc"
  );
});

test("telemedRoomUrl: sala Jitsi só quando existe", () => {
  assert.equal(telemedRoomUrl("renova-1-ab"), "https://meet.jit.si/renova-1-ab");
  assert.equal(telemedRoomUrl(null), null);
  assert.equal(telemedRoomUrl(""), null);
});

test("telemedMessage leva o link da sala", () => {
  assert.equal(
    telemedMessage(appt, "https://meet.jit.si/r"),
    "Olá Maria da Silva! Sua teleconsulta na Clínica Renova é em 24/09/2026 às 14:30. Acesse a sala pelo link: https://meet.jit.si/r"
  );
});

test("reminderMessage: primeiro nome, data curta e pedido de confirmação", () => {
  assert.equal(
    reminderMessage({ ...appt, status: "agendado" }, "Clínica X", "L"),
    "Olá Maria! Lembrete da sua consulta 24/09 às 14:30 com Dra. Ana na Clínica X. Confirme aqui: L"
  );
});

test("reminderMessage: já confirmado, o link serve para avisar que não vai", () => {
  assert.equal(
    reminderMessage({ ...appt, status: "confirmado" }, "Clínica X", "L"),
    "Olá Maria! Lembrete da sua consulta 24/09 às 14:30 com Dra. Ana na Clínica X. Sua presença já está confirmada. Se não puder ir, avise por aqui: L"
  );
});
