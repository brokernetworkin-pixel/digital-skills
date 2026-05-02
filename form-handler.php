<?php
/**
 * Digital Skills — Lead capture backend
 * Accepts POST JSON → sends email notification + forwards to Google Sheets
 */

/* ---------- CORS ---------- */
header('Access-Control-Allow-Origin: https://digitalskills.digital');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

/* ---------- Parse body ---------- */
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

$name   = htmlspecialchars(trim($data['name']   ?? ''), ENT_QUOTES, 'UTF-8');
$phone  = htmlspecialchars(trim($data['phone']  ?? ''), ENT_QUOTES, 'UTF-8');
$email  = htmlspecialchars(trim($data['email']  ?? ''), ENT_QUOTES, 'UTF-8');
$course = htmlspecialchars(trim($data['course'] ?? ''), ENT_QUOTES, 'UTF-8');
$source = htmlspecialchars(trim($data['source'] ?? ''), ENT_QUOTES, 'UTF-8');

// Basic validation
if (!$name || !$phone || !$email) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
    exit;
}

/* ---------- Current IST time ---------- */
date_default_timezone_set('Asia/Kolkata');
$datetime = date('d M Y, h:i A') . ' IST';

/* ---------- Send email ---------- */
$to      = 'digitalskills.digital@gmail.com';
$subject = "New Lead - Digital Skills: {$name}";

$body = "New Demo Booking Request!\n";
$body .= str_repeat('-', 40) . "\n\n";
$body .= "Name:            {$name}\n";
$body .= "Phone:           {$phone}\n";
$body .= "Email:           {$email}\n";
$body .= "Course Interest: {$course}\n";
$body .= "How they heard:  {$source}\n";
$body .= "Date/Time:       {$datetime}\n";

$headers  = "From: no-reply@digitalskills.digital\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$mail_sent = mail($to, $subject, $body, $headers);

/* ---------- Forward to Google Sheets ---------- */
$sheets_url = 'https://script.google.com/macros/s/AKfycbyM3dmviXi2CU0_8KpsgtEsxrDEvlTu-sDh-mAVKFIWiPBE9joXNeP3_7w4EpW5RiQecg/exec';

$payload = json_encode([
    'name'   => $name,
    'phone'  => $phone,
    'email'  => $email,
    'course' => $course,
    'source' => $source,
]);

$ch = curl_init($sheets_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_FOLLOWLOCATION => true,   // Apps Script issues a redirect
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$sheets_response = curl_exec($ch);
$sheets_error    = curl_error($ch);
curl_close($ch);

/* ---------- Respond ---------- */
// Return success as long as the record was at least attempted
// (mail failure alone shouldn't block the user flow)
echo json_encode([
    'status'       => 'success',
    'mail_sent'    => $mail_sent,
    'sheets_ok'    => empty($sheets_error),
]);
