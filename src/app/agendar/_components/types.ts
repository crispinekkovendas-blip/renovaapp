import type { Professional } from "@/lib/db";

/** Só as colunas que o agendamento público mostra. */
export type BookingProfessional = Pick<Professional, "id" | "name" | "specialty" | "color">;
