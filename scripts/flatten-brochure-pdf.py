#!/usr/bin/env python3
"""Rasterize a brochure PDF so mobile viewers don't drop clipped text or alpha."""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("Uso: flatten-brochure-pdf.py <entrada.pdf> <salida.pdf>", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    if not src.exists():
        print(f"No existe {src}", file=sys.stderr)
        return 1

    try:
        import pypdfium2 as pdfium
    except ImportError:
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "-q", "pypdfium2"])
        import pypdfium2 as pdfium

    from PIL import Image

    pdf = pdfium.PdfDocument(str(src))
    pages: list[Image.Image] = []
    for page in pdf:
        bitmap = page.render(scale=2.4)
        pages.append(bitmap.to_pil().convert("RGB"))

    if not pages:
        print("El PDF de entrada no tiene páginas.", file=sys.stderr)
        return 1

    dst.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(
        dst,
        save_all=True,
        append_images=pages[1:],
        format="PDF",
        resolution=173.0,
        quality=88,
    )
    print(f"PDF aplanado ({len(pages)} páginas): {dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
