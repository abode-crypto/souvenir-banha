<?php
if (!defined('APP_RUNNING')) exit('No direct access');

function orders_dispatch(string $method, array $seg) {
    $sub = $seg[1] ?? null;

    if ($method === 'POST' && $sub === null) return orders_create();

    if ($method === 'GET' && $sub !== null) return orders_get($sub);

    json_error('Not found', 404);
}

function orders_create() {
    $body = read_json_body();

    $name = trim((string)($body['customer_name'] ?? ''));
    $phone = trim((string)($body['customer_phone'] ?? ''));
    $address = trim((string)($body['customer_address'] ?? ''));
    $city = trim((string)($body['customer_city'] ?? ''));
    $items = $body['order_items'] ?? null;

    if (!$name || !$phone || !$city || !$address) {
        json_error('جميع بيانات العميل مطلوبة');
    }
    if (!is_array($items) || count($items) === 0) {
        json_error('السلة فارغة');
    }

    $total = 0.0;
    $clean = [];
    foreach ($items as $it) {
        if (!is_array($it)) continue;
        $q = max(1, (int)($it['quantity'] ?? 1));
        $p = (float)($it['price'] ?? 0);
        $pid = (int)($it['productId'] ?? 0);
        $total += $p * $q;
        $clean[] = ['productId' => $pid, 'quantity' => $q, 'price' => round($p, 2)];
    }
    if (count($clean) === 0) json_error('السلة فارغة');

    $uuid = uuid_v4();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO orders (uuid, customer_name, customer_phone, customer_address, customer_city, total, status) VALUES (?,?,?,?,?,?, \'pending\')');
        $stmt->execute([$uuid, $name, $phone, $address, $city, round($total, 2)]);
        $orderId = (int)$pdo->lastInsertId();

        $insItem = $pdo->prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)');
        foreach ($clean as $it) {
            $insItem->execute([$orderId, $it['productId'], $it['quantity'], $it['price']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('فشل حفظ الطلب', 500);
    }

    $_SESSION['cart'] = [];

    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    $order['id'] = (int)$order['id'];
    $order['total'] = (float)$order['total'];

    json_out($order, 201);
}

function orders_get(string $uuid) {
    $stmt = db()->prepare('SELECT * FROM orders WHERE uuid = ?');
    $stmt->execute([$uuid]);
    $order = $stmt->fetch();
    if (!$order) json_error('الطلب غير موجود', 404);

    $order['id'] = (int)$order['id'];
    $order['total'] = (float)$order['total'];

    $stmt = db()->prepare(
        'SELECT oi.product_id, oi.quantity, oi.price,
                COALESCE(p.name, \'منتج محذوف\') AS name,
                p.img AS image
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?'
    );
    $stmt->execute([$order['id']]);
    $items = $stmt->fetchAll();
    foreach ($items as &$it) {
        $it['product_id'] = $it['product_id'] !== null ? (int)$it['product_id'] : null;
        $it['quantity'] = (int)$it['quantity'];
        $it['price'] = (float)$it['price'];
    }
    unset($it);

    $order['items'] = $items;
    json_out($order);
}