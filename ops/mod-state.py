#!/usr/bin/env python3
"""Validate a mod state envelope and print its screen or the complete JSON response."""
import argparse
import json
import sys


def reject_constant(_value):
    raise ValueError("invalid JSON constant")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print the complete validated envelope")
    args = parser.parse_args()
    try:
        envelope = json.load(sys.stdin, parse_constant=reject_constant)
        if not isinstance(envelope, dict) or envelope.get("ok") is not True:
            raise ValueError("unsuccessful envelope")
        data = envelope.get("data")
        if not isinstance(data, dict):
            raise ValueError("missing state")
        screen = data.get("screen")
        if not isinstance(screen, str) or not screen.strip() or any(ord(c) < 32 for c in screen):
            raise ValueError("missing screen")
    except (ValueError, TypeError):
        # Never echo an untrusted response or exception payload into the ops transcript.
        print("invalid mod state response", file=sys.stderr)
        return 1
    print(json.dumps(envelope, ensure_ascii=False, allow_nan=False) if args.json else screen)
    return 0


if __name__ == "__main__":
    sys.exit(main())
