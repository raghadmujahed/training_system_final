<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

/**
 * يخدم ملفات storage/app/public عند غياب symlink (شائع على Railway بعد النشر).
 */
Route::get('/storage/{path}', function (string $path) {
    $path = str_replace(['..', '\\'], '', $path);
    if ($path === '' || ! Storage::disk('public')->exists($path)) {
        abort(404);
    }

    return Storage::disk('public')->response($path);
})->where('path', '.*');

if (app()->environment('local')) {
    Route::get('/db-debug', function () {

        $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

        foreach ($tables as $table) {
            echo "<h3>TABLE: {$table->name}</h3>";

            $columns = DB::select("PRAGMA table_info('{$table->name}')");

            foreach ($columns as $col) {
                echo $col->name . " | " . $col->type . "<br>";
            }

            echo "<hr>";
        }
    });
}