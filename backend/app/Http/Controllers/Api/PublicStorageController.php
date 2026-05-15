<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PublicStorageController extends Controller
{
    /**
     * عرض ملفات الصور الشخصية عبر /api/avatars/... (يعمل على Railway بدون symlink).
     */
    public function avatar(string $path): Response
    {
        $path = str_replace(['..', '\\'], ['', '/'], $path);
        $path = ltrim($path, '/');

        if ($path === '' || ! str_starts_with($path, 'avatars/')) {
            abort(404);
        }

        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return Storage::disk('public')->response($path, null, [
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
