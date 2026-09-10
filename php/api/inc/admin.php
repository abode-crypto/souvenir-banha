<?php
if (!defined('APP_RUNNING')) exit('No direct access');

function admin_dispatch(string $method, array $seg) {
    $sub = $seg[1] ?? null;

    if ($method === 'POST' && $sub === 'login') return admin_login();
    if ($method === 'POST' && $sub === 'logout') {
        $_SESSION['isAdmin'] = false;
        return json_out(['isAdmin' => false]);
    }
    if ($method === 'GET' && $sub === 'status') {
        return json_out(['isAdmin' => is_admin()]);
    }

    json_error('Not found', 404);
}

function admin_login() {
    $body = read_json_body();
    $password = (string)($body['password'] ?? '');
    if ($password === '') json_error('كلمة السر مطلوبة');
    if (!is_string(ADMIN_PASSWORD_HASH) || !password_verify($password, ADMIN_PASSWORD_HASH)) {
        json_error('كلمة السر خاطئة', 401);
    }
    $_SESSION['isAdmin'] = true;
    json_out(['isAdmin' => true]);
}