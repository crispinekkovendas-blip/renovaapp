import assert from "node:assert/strict";
import { test } from "node:test";
import { nextAppointment } from "./next-appointment.ts";

const appt = (start_time, status = "agendado", professional_id = 1) => ({ start_time, status, professional_id });

test("sem consultas abertas não destaca ninguém", () => {
  assert.equal(nextAppointment([], "10:00", null), null);
  assert.equal(nextAppointment([appt("09:00", "concluido"), appt("10:00", "cancelado")], "08:00", null), null);
});

test("quem está em atendimento vem antes de qualquer horário", () => {
  const list = [appt("09:00"), appt("10:00", "em_atendimento"), appt("11:00")];
  const result = nextAppointment(list, "09:00", null);
  assert.equal(result.kind, "em_atendimento");
  assert.equal(result.appointment, list[1]);
});

test("a próxima é a primeira a partir de agora, com meia hora de tolerância", () => {
  const list = [appt("08:00"), appt("09:40"), appt("11:00")];
  assert.equal(nextAppointment(list, "10:10", null).appointment, list[1]);
  assert.equal(nextAppointment(list, "10:10", null).kind, "proximo");
  assert.equal(nextAppointment(list, "10:11", null).appointment, list[2]);
});

test("se todas as abertas já passaram, destaca a mais recente como atraso", () => {
  const list = [appt("08:00"), appt("09:00"), appt("10:00", "concluido")];
  const result = nextAppointment(list, "17:00", null);
  assert.equal(result.kind, "atrasado");
  assert.equal(result.appointment, list[1]);
});

test("o profissional só vê a própria agenda; sem vínculo vê todas", () => {
  const list = [appt("09:00", "agendado", 2), appt("10:00", "agendado", 1)];
  assert.equal(nextAppointment(list, "08:00", 1).appointment, list[1]);
  assert.equal(nextAppointment(list, "08:00", null).appointment, list[0]);
  assert.equal(nextAppointment(list, "08:00", 3), null);
});

test("aceita horário com segundos", () => {
  const list = [appt("09:30:00")];
  assert.equal(nextAppointment(list, "09:45", null).kind, "proximo");
});
