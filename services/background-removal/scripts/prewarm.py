"""Script to pre-download and verify u2netp model weights."""

import os
import sys
import rembg


def main() -> None:
    model_name = os.getenv("REMBG_MODEL", "u2netp")
    print(f"Pre-warming rembg model '{model_name}'...")
    try:
        session = rembg.new_session(model_name)
        print(f"Model '{model_name}' loaded successfully into session: {session}")
    except Exception as exc:
        print(f"Error pre-warming model: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
