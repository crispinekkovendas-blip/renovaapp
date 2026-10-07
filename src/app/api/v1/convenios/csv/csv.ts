/**
 * CSV de faturamento de um convênio (Excel pt-BR: separador ";", vírgula
 * decimal, BOM para os acentos). Puro — o formato é contrato com quem importa
 * o arquivo, então os testes travam cada byte.
 */
import { fmtDate } from "../../../../../lib/format.ts";

export interface CsvRow {
  date: string;
  start_time: string;
  procedure: string;
  price_cents: number;
  patient_name: string;
  cpf: string | null;
  insurance_number: string | null;
}

const HEADER = "Data;Hora;Paciente;CPF;Carteirinha;Procedimento;Valor (R$)";

/** Aspas só quando o texto tem separador, aspas ou quebra de linha. */
export function csvField(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Centavos → "1234,50". */
export function csvMoney(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Corpo do arquivo, com BOM, linhas em CRLF e a linha de TOTAL no fim. */
export function insuranceCsv(rows: readonly CsvRow[]): string {
  const lines = [HEADER];
  for (const row of rows) {
    lines.push(
      [
        fmtDate(row.date),
        row.start_time,
        csvField(row.patient_name),
        row.cpf ?? "",
        csvField(row.insurance_number ?? ""),
        csvField(row.procedure),
        csvMoney(row.price_cents),
      ].join(";")
    );
  }
  const total = rows.reduce((sum, row) => sum + row.price_cents, 0);
  lines.push(["TOTAL", "", "", "", "", "", csvMoney(total)].join(";"));
  return `\uFEFF${lines.join("\r\n")}`;
}

/** "faturamento-bradesco-saude-2026-09.csv" — só [a-z0-9-]; nome vazio vira "convenio". */
export function insuranceCsvFilename(convenio: string, month: string): string {
  const slug = convenio.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "convenio";
  return `faturamento-${slug}-${month}.csv`;
}
