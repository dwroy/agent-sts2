"""Run one fixed test command and attest its actual completion; no games or models."""
import base64
import json
import subprocess
import sys

token, *command = sys.argv[1:]
result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print(json.dumps({"token": token, "status": result.returncode,
                  "stdout": base64.b64encode(result.stdout).decode("ascii"),
                  "stderr": base64.b64encode(result.stderr).decode("ascii")}))
