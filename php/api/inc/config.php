<?php
if (!defined('APP_RUNNING')) exit('No direct access');

mb_internal_encoding('UTF-8');

define('APP_BASE', dirname(__DIR__, 2));

define('ADMIN_PASSWORD_HASH', getenv('ADMIN_PASSWORD_HASH') ?: '$2y$10$I.lWMRTM/2C4VK77SqwfN.JKXTRYlN1tD8oRaHZxRMiqpC9/2a1Vm');

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'souvenir_banha');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

define('UPLOAD_DIR', APP_BASE . '/uploads');
define('UPLOAD_URL', '/uploads');