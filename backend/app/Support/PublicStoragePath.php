<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class PublicStoragePath
{
    public static function normalize(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $path = str_replace(['..', '\\'], ['', '/'], trim($path));
        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return $path === '' ? null : $path;
    }

    public static function exists(?string $path): bool
    {
        $normalized = self::normalize($path);

        return $normalized !== null && Storage::disk('public')->exists($normalized);
    }
}
