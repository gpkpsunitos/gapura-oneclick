#!/usr/bin/env bash
# One-command local dev startup
# Usage: ./run_local.sh
#        ./run_local.sh --csv sample_data.csv   (train on CSV before serving)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Create venv if needed
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

# 2. Install deps
echo "Installing dependencies..."
pip install -q -r requirements.txt

# 3. Load .env via python-dotenv (export $(grep ... | xargs) breaks on the
#    multi-line GOOGLE_PRIVATE_KEY and unquoted values with spaces)
if [ -f ".env" ]; then
  eval "$(python - <<'PYEOF'
from dotenv import dotenv_values
import shlex
for k, v in dotenv_values(".env").items():
    if v is not None:
        print(f"export {k}={shlex.quote(v)}")
PYEOF
)"
  echo "Loaded .env"
fi

# 4. Optional: pre-train on a CSV before the server starts
if [[ "$1" == "--csv" && -n "$2" ]]; then
  echo ""
  echo "Pre-training on $2..."
  python trainer.py --csv "$2"
  echo ""
fi

# 5. Start the server
echo ""
echo "Starting FastAPI server on http://localhost:7860"
echo "Docs: http://localhost:7860/docs"
echo ""
uvicorn app:app --host 0.0.0.0 --port 7860 --reload
