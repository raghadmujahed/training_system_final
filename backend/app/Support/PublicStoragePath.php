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
        return self::resolveExistingPath($path) !== null;
    }

    /**
     * يعيد مساراً نسبياً على قرص public إن وُجد الملف فعلياً.
     */
    public static function resolveExistingPath(?string $path): ?string
    {
        $normalized = self::normalize($path);
        if ($normalized === null) {
            return null;
        }

        $candidates = array_unique(array_filter([
            $normalized,
            str_starts_with($normalized, 'task_submissions/') ? null : 'task_submissions/'.basename($normalized),
            str_starts_with($normalized, 'portfolio/') ? null : 'portfolio/'.basename($normalized),
        ]));

        foreach ($candidates as $candidate) {
            if (Storage::disk('public')->exists($candidate)) {
                return $candidate;
            }

            $absolute = storage_path('app/public/'.$candidate);
            if (is_file($absolute)) {
                return $candidate;
            }
        }

        return null;
    }
}
