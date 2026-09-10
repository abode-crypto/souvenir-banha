<?php
define('APP_RUNNING', true);

ini_set('display_errors', '1');
error_reporting(E_ALL);

session_start();

require __DIR__ . '/inc/config.php';
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/helpers.php';
require __DIR__ . '/inc/products.php';
require __DIR__ . '/inc/categories.php';
require __DIR__ . '/inc/admin.php';
require __DIR__ . '/inc/cart.php';
require __DIR__ . '/inc/orders.php';

$route = '';
if (isset($_GET['route'])) {
    $route = trim((string)$_GET['route'], '/');
} elseif (isset($_SERVER['PATH_INFO'])) {
    $route = trim($_SERVER['PATH_INFO'], '/');
}
$route = preg_replace('/\?.*$/', '', $route);
$seg = array_values(array_filter(explode('/', $route)));
$resource = $seg[0] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($resource) {
        case 'products':
            products_dispatch($method, $seg);
            break;
        case 'categories':
            categories_dispatch($method, $seg);
            break;
        case 'admin':
            admin_dispatch($method, $seg);
            break;
        case 'cart':
            cart_dispatch($method, $seg);
            break;
        case 'orders':
            orders_dispatch($method, $seg);
            break;
        default:
            json_error('Not found', 404);
    }
} catch (Throwable $e) {
    json_error('Internal server error', 500);
}