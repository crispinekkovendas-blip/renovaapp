import QRCode from "qrcode";

/**
 * QR em SVG inline, gerado no servidor — a página não depende de JS no
 * celular para mostrar. Só o texto passado entra no código: um link da Memed,
 * a URL de validação de um documento. Qualquer falha (texto grande demais,
 * biblioteca fora) vira null e a página segue sem o QR.
 */
export async function qrSvg(text: string, size = 180): Promise<string | null> {
  try {
    return await QRCode.toString(text, {
      type: "svg",
      margin: 0,
      width: size,
      errorCorrectionLevel: "M",
      color: { dark: "#0c221c", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}
