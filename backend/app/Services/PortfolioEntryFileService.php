<?php

namespace App\Services;

use App\Models\PortfolioEntry;
use App\Models\StudentEForm;
use App\Support\PublicStoragePath;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class PortfolioEntryFileService
{
    private const WEEKLY_FULL_LABELS = [
        'course' => 'المساق',
        'morningAssembly' => 'الطابور الصباحي',
        'duty' => 'المناوبة',
        'implementedLessons' => 'الحصص التي نفذها',
        'teachingAids' => 'الوسائل التي أعدها',
        'activities' => 'الأنشطة التي قام بها',
        'meetings' => 'حضور الاجتماعات',
    ];

    public function resolveDiskPath(PortfolioEntry $entry): ?string
    {
        if ($entry->file_path) {
            $resolved = PublicStoragePath::resolveExistingPath($entry->file_path);
            if ($resolved) {
                return $resolved;
            }
        }

        $entry->loadMissing('studentPortfolio');
        $portfolioId = $entry->student_portfolio_id;

        $peers = PortfolioEntry::query()
            ->where('student_portfolio_id', $portfolioId)
            ->where('id', '!=', $entry->id)
            ->whereNotNull('file_path')
            ->orderByDesc('updated_at')
            ->get();

        if ($entry->category) {
            foreach ($peers as $peer) {
                if ($peer->category === $entry->category) {
                    $path = PublicStoragePath::resolveExistingPath($peer->file_path);
                    if ($path) {
                        return $path;
                    }
                }
            }
        }

        $titleRoot = trim((string) preg_replace('/\s*—.*$/u', '', (string) $entry->title));
        if ($titleRoot !== '') {
            foreach ($peers as $peer) {
                if (str_contains((string) $peer->title, $titleRoot)) {
                    $path = PublicStoragePath::resolveExistingPath($peer->file_path);
                    if ($path) {
                        return $path;
                    }
                }
            }
        }

        if (preg_match('/^eform:(\d+)$/i', (string) $entry->code, $m)) {
            $eform = StudentEForm::find((int) $m[1]);
            if ($eform?->form_key) {
                foreach ($peers as $peer) {
                    if ($peer->category === $eform->form_key) {
                        $path = PublicStoragePath::resolveExistingPath($peer->file_path);
                        if ($path) {
                            return $path;
                        }
                    }
                }
            }
        }

        foreach ($peers as $peer) {
            $path = PublicStoragePath::resolveExistingPath($peer->file_path);
            if ($path) {
                return $path;
            }
        }

        return null;
    }

    public function buildHtmlPreview(PortfolioEntry $entry): ?string
    {
        $payload = $this->extractPayload($entry);
        if (! $payload) {
            return null;
        }

        $title = htmlspecialchars((string) ($entry->title ?: 'التقرير'), ENT_QUOTES, 'UTF-8');
        $rows = '';

        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                continue;
            }
            $label = htmlspecialchars(
                self::WEEKLY_FULL_LABELS[$key] ?? (string) $key,
                ENT_QUOTES,
                'UTF-8'
            );
            $text = trim((string) $value);
            $val = htmlspecialchars($text !== '' ? $text : '—', ENT_QUOTES, 'UTF-8');
            $rows .= "<tr><th>{$label}</th><td>".nl2br($val)."</td></tr>";
        }

        if ($rows === '') {
            return null;
        }

        return <<<HTML
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>{$title}</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;direction:rtl;color:#1e293b}
h1{color:#be123c;font-size:1.35rem}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #e2e8f0;padding:10px;text-align:right;vertical-align:top}
th{background:#fdf2f8;width:30%;font-weight:700}
</style>
</head>
<body>
<h1>{$title}</h1>
<table>{$rows}</table>
</body>
</html>
HTML;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function extractPayload(PortfolioEntry $entry): ?array
    {
        $content = $entry->content;
        if ($content) {
            try {
                $decoded = is_string($content) ? json_decode($content, true, 512, JSON_THROW_ON_ERROR) : $content;
                if (is_array($decoded) && $decoded !== []) {
                    return $decoded;
                }
            } catch (\Throwable) {
                // continue
            }
        }

        if (preg_match('/^eform:(\d+)$/i', (string) $entry->code, $m)) {
            $eform = StudentEForm::find((int) $m[1]);
            if (is_array($eform?->payload) && $eform->payload !== []) {
                return $eform->payload;
            }
        }

        return null;
    }

    public function fileResponse(PortfolioEntry $entry): Response
    {
        $path = $this->resolveDiskPath($entry);
        if ($path) {
            $filename = basename($path);

            return Storage::disk('public')->response($path, $filename, [
                'Content-Disposition' => 'inline; filename="'.$filename.'"',
                'Cache-Control' => 'private, max-age=3600',
            ]);
        }

        $html = $this->buildHtmlPreview($entry);
        if ($html) {
            $safeName = preg_replace('/[^\p{L}\p{N}\-_]+/u', '_', (string) ($entry->title ?: 'portfolio')) ?: 'portfolio';

            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Content-Disposition' => 'inline; filename="'.$safeName.'.html"',
                'Cache-Control' => 'private, max-age=300',
            ]);
        }

        return response()->json([
            'message' => 'الملف غير موجود على الخادم. احفظ النموذج مرة أخرى لتوليد الملف، أو أعد رفعه من ملف الإنجاز.',
            'code' => 'file_missing_on_disk',
            'file_path' => $entry->file_path,
        ], 404);
    }
}
