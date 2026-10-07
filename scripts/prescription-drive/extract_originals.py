"""
Extrai os cards originais do Drive de Prescrições (Dra. Camilla Rocha) do
PDF do e-book, para o carrossel "do original até hoje" de cada entrada do
Drive revisado. Reprodução autorizada pela autora (confirmado pelo usuário
em 02/10/2026).

Uso: python scripts/prescription-drive/extract_originals.py <ebook_camilladrive.pdf>
Gera src/lib/prescription-drive/originals.json (título, página e linhas de
cada card). A marca d'água de licença ("Licensed to …") e o número da página
ficam de fora.
"""

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

FIRST_CONTENT_PAGE = 10  # 1-based: antes disso, capa, apresentação e índice
TITLE_SIZE = 23
TITLE_COLOR = 4032674
OUT = Path(__file__).resolve().parents[2] / "src" / "lib" / "prescription-drive" / "originals.json"
# Card cujo título saiu em fonte de texto e nem está no índice.
TITLES_IN_BODY_FONT = {"DIP(1)"}


def is_title(span):
    return "Bold" in span["font"] and round(span["size"]) == TITLE_SIZE and span["color"] == TITLE_COLOR


def skip(span):
    # Número da página (branco) e marca d'água da licença (Courier).
    return span["color"] == 16777215 or span["font"].startswith("Courier")


def clean_title(parts):
    title = re.sub(r"\s+", " ", " ".join(parts)).strip()
    return re.sub(r"\s*:\s*$", "", title)


def merge_wrapped(lines):
    """Linha que começa em minúscula continua a anterior (quebra do PDF, não do autor)."""
    out = []
    for line in lines:
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        if out and re.match(r"^[a-zà-ú(]", line) and not re.match(r"^(ou|e)\b", line, re.I):
            out[-1] = f"{out[-1]} {line}"
        else:
            out.append(line)
    return out


def norm(text):
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def index_titles(doc):
    """Títulos do índice (páginas 6 a 9), para achar card cujo título veio em fonte de texto (ex.: "DIP(1):")."""
    titles = set()
    for pno in range(5, FIRST_CONTENT_PAGE - 1):
        for line in doc[pno].get_text().splitlines():
            line = line.strip()
            if line and not set(line) <= set(". 0123456789") and line != "Índice" and "Licensed" not in line:
                titles.add(norm(line))
    return titles


def extract(pdf_path):
    doc = fitz.open(pdf_path)
    known = index_titles(doc) | {norm(t) for t in TITLES_IN_BODY_FONT}
    cards = []
    current = None
    title_parts = []
    title_page = 0
    for pno in range(FIRST_CONTENT_PAGE - 1, doc.page_count):
        page = doc[pno]
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                spans = [s for s in line["spans"] if s["text"].strip() and not skip(s)]
                if not spans:
                    continue
                # Título: em fonte de título; o ":" do fim às vezes vem noutro estilo e não conta.
                text = " ".join(s["text"].strip() for s in spans)
                if is_title(spans[0]) and all(is_title(s) or not re.search(r"\w", s["text"]) for s in spans):
                    title_page = title_page if title_parts else pno + 1
                    title_parts.append(text)
                    continue
                if text.rstrip().endswith(":") and norm(text) in known and not title_parts:
                    title_page = pno + 1
                    title_parts.append(text)
                    continue
                if title_parts:
                    current = {"title": clean_title(title_parts), "page": title_page, "lines": []}
                    cards.append(current)
                    title_parts = []
                if current is not None:
                    current["lines"].append(" ".join(s["text"].strip() for s in spans))
    unique = {}
    for card in cards:
        card["lines"] = merge_wrapped(card["lines"])
        key = card["title"].upper()
        # O mesmo card às vezes se repete na virada de página: fica o primeiro.
        if key not in unique and card["lines"]:
            unique[key] = card
    return list(unique.values())


if __name__ == "__main__":
    pdf = sys.argv[1] if len(sys.argv) > 1 else "E:/admin-moved/Downloads/ebook_camilladrive.pdf"
    cards = extract(pdf)
    OUT.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(cards)} cards -> {OUT}")
