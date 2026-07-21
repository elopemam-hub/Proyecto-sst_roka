<?php
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo json_encode(['ok' => true, 'msg' => 'opcache reset']);
} else {
    echo json_encode(['ok' => false, 'msg' => 'opcache not available']);
}
