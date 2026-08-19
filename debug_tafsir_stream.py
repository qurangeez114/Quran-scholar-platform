#!/usr/bin/env python3
"""One-shot diagnostic for the Tafsir fidelity stream path."""
from pathlib import Path
import batch_tafsir_accuracy as b

pairs = b.load_tafsir_pairs()
if not pairs:
    raise SystemExit("No Arabic/English Ibn Kathir pairs found")

s, a, ar, en = pairs[0]
prompt = b.build_prompt(s, a, ar, en)
raw = b.call_claude(prompt)

out = Path('.github/diagnostics/stream-raw.txt')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(
    f"verse={s}:{a}\nlength={len(raw)}\nrepr={raw!r}\n\nRAW:\n{raw}\n",
    encoding='utf-8'
)
print(f"Captured {len(raw)} characters for {s}:{a} -> {out}")
