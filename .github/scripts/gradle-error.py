# Scrive il motivo dell'errore di Gradle come annotazione di GitHub Actions
# (visibile nella pagina del run e tramite API, anche senza accesso ai log).
import sys

lines = open(sys.argv[1], encoding="utf-8", errors="replace").read().splitlines()
start = next(
    (i for i, line in enumerate(lines) if "What went wrong" in line),
    max(0, len(lines) - 30),
)
msg = "\n".join(lines[start : start + 30])
msg = msg.replace("%", "%25").replace("\r", "").replace("\n", "%0A")
print(f"::error title=Gradle::{msg}")
