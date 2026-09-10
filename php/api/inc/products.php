<?php
if (!defined('APP_RUNNING')) exit('No direct access');

function products_dispatch(string $method, array $seg) {
    $sub = $seg[1] ?? null;

    if ($method === 'GET') {
        if ($sub === 'new') return products_list('DESC');
        if ($sub === 'categories') return products_categories_list();
        if ($sub !== null) {
            $p = product_by_id((int)$sub);
            if (!$p) json_error('المنتج غير موجود', 404);
            return json_out($p);
        }
        return products_list('ASC');
    }

    if ($method === 'POST') return products_create();

    if ($method === 'PUT') {
        if ($sub === null) json_error('Not found', 404);
        return products_update((int)$sub);
    }

    if ($method === 'DELETE') {
        if ($sub === null) json_error('Not found', 404);
        return products_delete((int)$sub);
    }

    json_error('Method not allowed', 405);
}

function products_list(string $order) {
    $category = $_GET['category'] ?? null;
    $direction = $order === 'DESC' ? 'DESC' : 'ASC';
    if ($category && $category !== 'all') {
        $stmt = db()->prepare("SELECT * FROM products WHERE category = ? ORDER BY id $direction");
        $stmt->execute([$category]);
    } else {
        $stmt = db()->prepare("SELECT * FROM products ORDER BY id $direction");
        $stmt->execute();
    }
    $rows = array_map('normalize_product', $stmt->fetchAll());
    json_out($rows);
}

function products_categories_list() {
    $rows = db()->query("SELECT DISTINCT category FROM products ORDER BY category")->fetchAll();
    json_out(array_map(fn($r) => $r['category'], $rows));
}

function products_create() {
    require_admin();

    $form = request_form();
    $name = trim($form['fields']['name'] ?? '');
    $category = trim($form['fields']['category'] ?? '');
    $specs = trim($form['fields']['specs'] ?? '');
    $price = isset($form['fields']['price']) && $form['fields']['price'] !== '' ? (float)$form['fields']['price'] : null;
    $oldPrice = isset($form['fields']['oldPrice']) && $form['fields']['oldPrice'] !== '' ? (float)$form['fields']['oldPrice'] : null;
    $description = trim($form['fields']['description'] ?? '');
    $img = trim($form['fields']['img'] ?? '');

    if (!$name || !$category || !$specs || $price === null || !$description) {
        json_error('جميع الحقول الأساسية مطلوبة');
    }

    $finalImage = null;
    if (!empty($form['files']['image']) && $form['files']['image']['error'] === UPLOAD_ERR_OK) {
        $finalImage = handle_upload($form['files']['image']);
    } elseif ($img) {
        $finalImage = $img;
    }
    if (!$finalImage) json_error('صورة المنتج مطلوبة');

    if ($oldPrice !== null && $oldPrice <= 0) $oldPrice = null;

    $pdo = db();
    $stmt = $pdo->prepare('INSERT INTO products (name, category, specs, price, oldPrice, img, description) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([$name, $category, $specs, $price, $oldPrice, $finalImage, $description]);
    json_out(product_by_id((int)$pdo->lastInsertId()), 201);
}

function products_update(int $id) {
    require_admin();

    $existing = product_by_id($id);
    if (!$existing) json_error('المنتج غير موجود', 404);

    $form = request_form();
    $name = trim($form['fields']['name'] ?? '');
    $category = trim($form['fields']['category'] ?? '');
    $specs = trim($form['fields']['specs'] ?? '');
    $price = isset($form['fields']['price']) && $form['fields']['price'] !== '' ? (float)$form['fields']['price'] : null;
    $oldPrice = isset($form['fields']['oldPrice']) && $form['fields']['oldPrice'] !== '' ? (float)$form['fields']['oldPrice'] : null;
    $description = trim($form['fields']['description'] ?? '');

    if (!$name || !$category || !$specs || $price === null || !$description) {
        json_error('جميع الحقول الأساسية مطلوبة');
    }

    $finalImage = null;
    if (!empty($form['files']['image']) && $form['files']['image']['error'] === UPLOAD_ERR_OK) {
        $finalImage = handle_upload($form['files']['image']);
        remove_uploaded($existing['img']);
    } else {
        $finalImage = trim($form['fields']['img'] ?? '') ?: $existing['img'];
    }
    if (!$finalImage) json_error('صورة المنتج مطلوبة');

    if ($oldPrice !== null && $oldPrice <= 0) $oldPrice = null;

    $stmt = db()->prepare('UPDATE products SET name=?, category=?, specs=?, price=?, oldPrice=?, img=?, description=? WHERE id=?');
    $stmt->execute([$name, $category, $specs, $price, $oldPrice, $finalImage, $description, $id]);
    json_out(product_by_id($id));
}

function products_delete(int $id) {
    require_admin();

    $existing = product_by_id($id);
    if (!$existing) json_error('المنتج غير موجود', 404);

    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM order_items WHERE product_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
    $pdo->commit();

    remove_uploaded($existing['img']);
    json_out(['success' => true]);
}