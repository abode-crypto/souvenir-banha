<?php
if (!defined('APP_RUNNING')) exit('No direct access');

function json_out(array $data, int $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400) {
    json_out(['error' => $message], $status);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : [];
}

function is_admin(): bool
{
    return !empty($_SESSION['isAdmin']);
}

function require_admin() {
    if (!is_admin()) {
        json_error('غير مصرح', 401);
    }
}

function uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function normalize_product(array $row): array
{
    $row['id'] = (int)$row['id'];
    $row['price'] = (float)$row['price'];
    $row['oldPrice'] = $row['oldPrice'] !== null ? (float)$row['oldPrice'] : null;
    return $row;
}

function product_by_id(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? normalize_product($row) : null;
}

function request_form(): array
{
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && strpos($ct, 'multipart/form-data') !== false) {
        return parse_multipart_raw();
    }
    return ['fields' => $_POST, 'files' => $_FILES];
}

function parse_multipart_raw(): array
{
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    $body = file_get_contents('php://input');
    if (!preg_match('/boundary=(.*)$/i', $ct, $m)) json_error('multipart boundary missing');
    $boundary = trim($m[1], '"');

    $fields = [];
    $files = [];
    foreach (explode('--' . $boundary, $body) as $part) {
        $part = str_replace("\r\n", "\n", $part);
        if (strpos($part, "\n\n") === false) continue;
        [$header, $content] = explode("\n\n", $part, 2);
        $content = preg_replace('/\n--$/', '', $content);
        $content = preg_replace('/\n$/', '', $content);

        if (!preg_match('/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i', $header, $hm)) {
            continue;
        }
        $name = $hm[1];
        $filename = $hm[2] ?? '';
        if ($filename !== '') {
            $mime = preg_match('/Content-Type:\s*([^\s;]+)/i', $header, $tm) ? $tm[1] : '';
            $files[$name] = [
                'name' => $filename,
                'type' => $mime,
                'error' => UPLOAD_ERR_OK,
                'size' => strlen($content),
                'bytes' => $content,
            ];
        } else {
            $fields[$name] = $content;
        }
    }
    return ['fields' => $fields, 'files' => $files];
}

function handle_upload(array $file): string
{
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed, true)) {
        json_error('صيغة الصورة غير مدعومة');
    }
    if (($file['error'] ?? 0) !== UPLOAD_ERR_OK) {
        json_error('فشل رفع الصورة');
    }
    if ((int)($file['size'] ?? 0) > 5 * 1024 * 1024) {
        json_error('الصورة أكبر من 5MB');
    }
    if (!is_dir(UPLOAD_DIR)) {
        @mkdir(UPLOAD_DIR, 0777, true);
    }
    $filename = 'product-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = UPLOAD_DIR . '/' . $filename;
    if (isset($file['bytes'])) {
        if (file_put_contents($dest, $file['bytes']) === false) json_error('فشل رفع الصورة');
    } elseif (!move_uploaded_file($file['tmp_name'], $dest)) {
        json_error('فشل رفع الصورة');
    }
    $info = @getimagesize($dest);
    if ($info === false && $ext !== 'svg') {
        @unlink($dest);
        json_error('الملف المرفوع ليس صورة صالحة');
    }
    return UPLOAD_URL . '/' . $filename;
}

function remove_uploaded(string $img) {
    if (strpos($img, UPLOAD_URL . '/') === 0) {
        @unlink(APP_BASE . $img);
    }
}