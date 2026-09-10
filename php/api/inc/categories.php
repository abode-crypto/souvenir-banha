<?php
if (!defined('APP_RUNNING')) exit('No direct access');

function categories_dispatch(string $method, array $seg) {
    if ($method !== 'GET') {
        json_error('Method not allowed', 405);
    }
    $rows = db()->query(
        "SELECT c.id, c.name,
                (SELECT COUNT(*) FROM products p WHERE p.category = c.name) AS product_count
         FROM categories c
         ORDER BY c.id"
    )->fetchAll();
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['product_count'] = (int)$r['product_count'];
    }
    unset($r);
    json_out($rows);
}