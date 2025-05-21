"""
Domain Setup Module
Configures DNS records and sets up a basic web server
"""

import os
import subprocess
import requests
import shutil
import json
from dotenv import load_dotenv

load_dotenv()

CLOUDFLARE_API_KEY = os.getenv("CLOUDFLARE_API_KEY")
CLOUDFLARE_EMAIL = os.getenv("CLOUDFLARE_EMAIL")

HEADERS = {
    "X-Auth-Email": CLOUDFLARE_EMAIL,
    "X-Auth-Key": CLOUDFLARE_API_KEY,
    "Content-Type": "application/json"
}

def install_apache():
    """Install Apache if not already installed"""
    if shutil.which("apache2"):
        return {"status": "info", "message": "Apache2 is already installed."}
    else:
        try:
            subprocess.call(["sudo", "apt", "update"])
            subprocess.call(["sudo", "apt", "install", "-y", "apache2"])
            return {"status": "success", "message": "Apache2 installed successfully."}
        except Exception as e:
            return {"status": "error", "message": f"Failed to install Apache: {str(e)}"}

def start_apache():
    """Start and enable Apache"""
    try:
        subprocess.call(["sudo", "systemctl", "start", "apache2"])
        subprocess.call(["sudo", "systemctl", "enable", "apache2"])
        return {"status": "success", "message": "Apache started and enabled."}
    except Exception as e:
        return {"status": "error", "message": f"Failed to start Apache: {str(e)}"}

def create_index_html():
    """Copy index.html to Apache document root"""
    source_path = "./assets/index.html"
    target_path = "/var/www/html/index.html"

    try:
        # Ensure the assets directory exists
        os.makedirs("./assets", exist_ok=True)
        
        # Create a default index.html if it doesn't exist
        if not os.path.exists(source_path):
            with open(source_path, "w") as f:
                f.write("<html><body><h1>Setup Complete</h1><p>Your phishing infrastructure is ready.</p></body></html>")
        
        # Copy to Apache document root
        subprocess.call(["sudo", "cp", source_path, target_path])
        return {"status": "success", "message": f"index.html copied to {target_path}"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to copy index.html: {str(e)}"}

def get_public_ip():
    """Get the server's public IP address"""
    try:
        response = requests.get("https://api.ipify.org?format=json")
        return response.json()["ip"]
    except Exception as e:
        return None

def get_zone_id(domain):
    """Get the Cloudflare zone ID for a domain"""
    try:
        response = requests.get("https://api.cloudflare.com/client/v4/zones", headers=HEADERS)
        zones = response.json().get("result", [])
        root_domain = ".".join(domain.split(".")[-2:])
        
        for zone in zones:
            if zone["name"] == root_domain:
                return zone["id"]
        
        return None
    except Exception as e:
        return None

def add_dns_record(domain, ip, zone_id):
    """Add an A record to Cloudflare DNS"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
    data = {
        "type": "A",
        "name": domain,
        "content": ip,
        "ttl": 120,
        "proxied": True
    }
    
    try:
        res = requests.post(url, headers=HEADERS, json=data)
        if res.status_code in [200, 201]:
            return {
                "status": "success", 
                "message": f"A record added: {domain} -> {ip} (Proxied)",
                "record_id": res.json().get("result", {}).get("id")
            }
        else:
            return {
                "status": "error", 
                "message": f"Failed to add DNS record: {res.text}"
            }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Request error: {str(e)}"
        }

# API function
def setup_domain_api(domain, ip_input=""):
    """API function for domain setup"""
    results = {
        "domain": domain,
        "steps": [],
        "status": "success"
    }
    
    # Step 1: Install and setup Apache
    apache_install = install_apache()
    results["steps"].append({"name": "install_apache", "result": apache_install})
    
    apache_start = start_apache()
    results["steps"].append({"name": "start_apache", "result": apache_start})
    
    index_html = create_index_html()
    results["steps"].append({"name": "create_index_html", "result": index_html})
    
    # Step 2: Determine IP to use
    ip_to_use = ip_input if ip_input else get_public_ip()
    results["ip"] = ip_to_use
    
    if not ip_to_use:
        results["status"] = "error"
        results["message"] = "Failed to determine IP address"
        return results
    
    # Step 3: Setup DNS
    zone_id = get_zone_id(domain)
    results["zone_id"] = zone_id
    
    if not zone_id:
        results["status"] = "error"
        results["message"] = f"Zone ID not found for {domain}. Make sure the domain is added to Cloudflare."
        return results
    
    dns_result = add_dns_record(domain, ip_to_use, zone_id)
    results["steps"].append({"name": "add_dns_record", "result": dns_result})
    
    if dns_result["status"] == "error":
        results["status"] = "error"
        results["message"] = dns_result["message"]
    
    return results

# Original CLI function - kept for backward compatibility
def setup_domain(domain):
    """Original CLI function for domain setup"""
    install_apache()
    start_apache()
    create_index_html()

    user_ip = input("Enter IP to assign (leave blank to use server public IP): ").strip()
    ip_to_use = user_ip if user_ip else get_public_ip()

    zone_id = get_zone_id(domain)
    if zone_id:
        add_dns_record(domain, ip_to_use, zone_id)
    
    return {"ip": ip_to_use, "zone_id": zone_id}

if __name__ == "__main__":
    domain_input = input("Enter full domain (e.g. login.example.com): ").strip()
    setup_domain(domain_input)
    print("[*] Domain setup completed.")