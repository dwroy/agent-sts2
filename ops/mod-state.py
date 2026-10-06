#!/usr/bin/env python3
"""Validate a mod state envelope and print its screen for the launch readiness check."""
import json
import sys


def main():
    try:
        envelope = json.load(sys.stdin)
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
    print(screen)
    return 0


if __name__ == "__main__":
    sys.exit(main())
