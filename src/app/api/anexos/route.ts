import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parsePositiveId, safeFileName, validateAttachment } from "@/lib/attachments";

/**
 * Upload de anexo do prontuário. Route Handler (e não Server Action) porque o
 * corpo de uma action é limitado a 1 MB; aqui aceitamos até 10 MB.
 */
export async function POST(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Envio inválido." }, { status: 400 });
  }

  const patientId = parsePositiveId(form.get("patient_id"));
  if (patientId === null) {
    return Response.json({ error: "Paciente inválido." }, { status: 400 });
  }

  // Vazio = anexo sem vínculo; preenchido, tem de ser um id válido.
  const rawEncounter = form.get("encounter_id");
  const linked = typeof rawEncounter === "string" && rawEncounter.trim() !== "";
  const encounterId = linked ? parsePositiveId(rawEncounter) : null;
  if (linked && encounterId === null) {
    return Response.json({ error: "Atendimento inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Selecione um arquivo." }, { status: 400 });
  }
  const declaredError = validateAttachment({ name: file.name, type: file.type, size: file.size });
  if (declaredError) return Response.json({ error: declaredError }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer());
  // O `size` declarado vem do navegador; o que conta é o que chegou.
  const realError = validateAttachment({ name: file.name, type: file.type, size: data.byteLength });
  if (realError) return Response.json({ error: realError }, { status: 400 });

  try {
    // As duas conferências são independentes: vão juntas ao banco.
    const [[patient], [encounter]] = await Promise.all([
      sql<{ id: number }>`SELECT id FROM patients WHERE id = ${patientId}`,
      encounterId !== null
        ? sql<{ id: number }>`SELECT id FROM encounters WHERE id = ${encounterId} AND patient_id = ${patientId}`
        : Promise.resolve([] as { id: number }[]),
    ]);
    if (!patient) return Response.json({ error: "Paciente não encontrado." }, { status: 404 });
    if (encounterId !== null && !encounter) {
      return Response.json({ error: "O atendimento não pertence a este paciente." }, { status: 400 });
    }

    const [row] = await sql<{ id: number }>`
      INSERT INTO attachments (patient_id, encounter_id, file_name, mime_type, size_bytes, data)
      VALUES (${patientId}, ${encounterId}, ${safeFileName(file.name)}, ${file.type}, ${data.byteLength}, ${data})
      RETURNING id`;
    return Response.json({ id: row.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível salvar o anexo." }, { status: 500 });
  }
}
