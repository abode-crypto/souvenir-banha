<?php
if (!defined('APP_RUNNING')) exit('No direct access');

function cart_dispatch(string $method, array $seg) {
    $sub = $seg[1] ?? null;

    if ($method === 'GET') return json_out(cart_payload());

    if ($method === 'POST' && $sub === 'add') return cart_add();

    if ($method === 'PUT' && $sub === 'update') return cart_update();

    if ($method === 'DELETE' && $sub !== null) return cart_remove((int)$sub);

    json_error('Method not allowed', 405);
}

function &cart_items(): array
{
    if (!isset($_SESSION['cart']) || !is_array($_SESSION['cart'])) {
        $_SESSION['cart'] = [];
    }
    return $_SESSION['cart'];
}

function cart_payload(): array
{
    $items = cart_items();
    $total = array_sum(array_map(fn($i) => (float)$i['price'] * (int)$i['quantity'], $items));
    return [
        'items' => array_values($items),
        'total' => round($total, 2),
    ];
}

function cart_add() {
    $body = read_json_body();
    $productId = (int)($body['productId'] ?? 0);
    $quantity = max(1, (int)($body['quantity'] ?? 1));
    if (!$productId) json_error('معرف المنتج مطلوب');

    $p = product_by_id($productId);
    if (!$p) json_error('المنتج غير موجود', 404);

    $items = &cart_items();
    $found = false;
    foreach ($items as &$item) {
        if ((int)$item['productId'] === $productId) {
            $item['quantity'] += $quantity;
            $found = true;
            break;
        }
    }
    unset($item);

    if (!$found) {
        $items[] = [
            'productId' => (int)$p['id'],
            'name' => $p['name'],
            'price' => (float)$p['price'],
            'image' => $p['img'],
            'quantity' => $quantity,
        ];
    }
    json_out(cart_payload());
}

function cart_update() {
    $body = read_json_body();
    $productId = (int)($body['productId'] ?? 0);
    $quantity = (int)($body['quantity'] ?? 0);

    $items = &cart_items();
    foreach ($items as $k => $item) {
        if ((int)$item['productId'] === $productId) {
            if ($quantity <= 0) {
                unset($items[$k]);
            } else {
                $items[$k]['quantity'] = $quantity;
            }
            json_out(cart_payload());
        }
    }
    json_error('المنتج غير موجود في السلة', 404);
}

function cart_remove(int $productId) {
    $items = &cart_items();
    foreach ($items as $k => $item) {
        if ((int)$item['productId'] === $productId) {
            unset($items[$k]);
            break;
        }
    }
    json_out(cart_payload());
}