import os
import signal

pids = [15988, 28352]

for pid in pids:
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Killed process {pid}")
    except:
        print(f"Could not kill {pid}")
