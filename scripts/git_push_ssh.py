"""Git push via paramiko (pure Python SSH)"""
import paramiko
import subprocess
import sys

REPO_DIR = "/home/z/my-project/infant"

def run_git(args, cwd=REPO_DIR):
    r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True)
    return r.stdout.strip(), r.stderr.strip(), r.returncode

def main():
    agent_keys = []
    try:
        agent = paramiko.Agent()
        agent_keys = agent.get_keys()
    except Exception:
        pass

    if not agent_keys:
        print("No SSH keys in agent. Trying file-based keys...")
        for keyfile in ["/home/z/.ssh/id_ed25519", "/home/z/.ssh/id_rsa", "/home/z/.ssh/id_ecdsa"]:
            if os.path.exists(keyfile):
                try:
                    key = paramiko.RSAKey.from_private_key_file(keyfile) if "rsa" in keyfile else paramiko.Ed25519Key.from_private_key_file(keyfile)
                    agent_keys.append(key)
                    print(f"Found key: {keyfile}")
                except Exception:
                    try:
                        key = paramiko.Ed25519Key.from_private_key_file(keyfile)
                        agent_keys.append(key)
                        print(f"Found key: {keyfile}")
                    except Exception as e:
                        print(f"Failed to load {keyfile}: {e}")

    if not agent_keys:
        print("ERROR: No SSH keys available. Cannot push.")
        return

    print(f"Found {len(agent_keys)} SSH key(s)")

    # Test SSH connection
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("github.com", 22, username="git", pkey=agent_keys[0], timeout=10)
        print("SSH connection to GitHub: OK")
        client.close()
    except Exception as e:
        print(f"SSH connection failed: {e}")
        return

    # Create SSH wrapper
    import os
    wrapper = os.path.join(REPO_DIR, "_ssh_wrapper.py")
    with open(wrapper, "w") as f:
        f.write("""
import paramiko, sys
agent = paramiko.Agent()
keys = agent.get_keys()
client = paramiko.SSHClient()
client.load_system_host_keys()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("github.com", 22, username="git", pkey=keys[0] if keys else None)
stdin, stdout, stderr = client.exec_command(" ".join(sys.argv[1:]))
sys.stdout.buffer.write(stdout.read())
sys.stderr.buffer.write(stderr.read())
client.close()
""")

    out, err, code = run_git([
        "-c", f"core.sshCommand=python {wrapper}",
        "push", "origin", "main"
    ])
    
    if code == 0:
        print("PUSH SUCCESS!")
        print(out)
    else:
        print(f"PUSH FAILED (exit {code})")
        print(f"stderr: {err}")
        print(f"stdout: {out}")

if __name__ == "__main__":
    main()
