<?php

namespace App\Helpers;

use App\Models\ActivityLog;
use App\Models\ActivityLogDetail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Request;
use Throwable;

class ActivityLogger
{
    private const REDACTED = '***';
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'token',
        'access_token',
        'refresh_token',
        'authorization',
        'secret',
        'api_key',
    ];

    /**
     * تسجيل نشاط في النظام.
     *
     * @param string      $type        نوع الكيان (user, training_request, ...)
     * @param string      $action      الإجراء (created, updated, deleted, login, ...)
     * @param string      $description وصف النشاط بالعربية
     * @param Model|null  $subject     الكيان المتأثر (اختياري)
     * @param array       $properties  بيانات إضافية (اختياري)
     * @param Model|null  $causer      المستخدم الذي قام بالإجراء (اختياري)
     *
     * @return ActivityLog|null null عند فشل الكتابة (مثلاً جدول غير مهاجر) حتى لا يُفسد الطلب الأساسي
     */
    public static function log(
        string $type,
        string $action,
        string $description,
        ?Model $subject = null,
        array $properties = [],
        ?Model $causer = null
    ): ?ActivityLog {
        $oldData = $properties['old'] ?? null;
        $newData = $properties['new'] ?? null;
        unset($properties['old'], $properties['new']);

        $actorId = $causer?->getKey() ?? auth()->id();

        try {
            $activityLog = ActivityLog::create([
                'user_id'       => $actorId,
                'causer_id'     => $actorId,
                'subject_type'  => $subject ? $type : null,
                'subject_id'    => $subject?->getKey(),
                'action'        => $type . '.' . $action,
                'description'   => $description,
                'ip_address'    => Request::ip(),
                'old_data'      => self::sanitizeData($oldData),
                'new_data'      => self::sanitizeData($newData ?? $properties),
                'method'        => Request::method(),
                'route'         => Request::path(),
                'user_agent'    => Request::userAgent(),
            ]);

            self::storeFieldLevelDetails($activityLog, $oldData, $newData ?? $properties);

            return $activityLog;
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }

    public static function logHttpRequest(HttpRequest $request, mixed $response, float $durationMs): ?ActivityLog
    {
        $statusCode = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : null;
        $route = $request->route();
        $routeAction = is_object($route) ? $route->getActionName() : null;
        $routeName = is_object($route) ? $route->getName() : null;
        $isIndexVisit = is_string($routeAction) && str_ends_with($routeAction, '@index') && strtoupper($request->method()) === 'GET';
        $actionLabel = $isIndexVisit ? 'index_visit' : 'request';

        return self::log(
            'http',
            $actionLabel,
            sprintf('%s %s', $request->method(), $request->path()),
            null,
            [
                'old' => null,
                'new' => [
                    'query' => self::sanitizeData($request->query()),
                    'body' => self::sanitizeData($request->all()),
                    'status_code' => $statusCode,
                    'duration_ms' => round($durationMs, 2),
                    'success' => is_int($statusCode) ? $statusCode < 400 : null,
                    'route_name' => $routeName,
                    'route_action' => $routeAction,
                    'is_index_visit' => $isIndexVisit,
                ],
            ],
            $request->user()
        );
    }

    public static function logModelChange(string $event, Model $model, ?array $old = null, ?array $new = null): ?ActivityLog
    {
        $modelType = (string) str(class_basename($model))->snake();

        return self::log(
            $modelType,
            $event,
            sprintf('%s %s', strtoupper($event), class_basename($model)),
            $model,
            [
                'old' => self::sanitizeData($old),
                'new' => self::sanitizeData($new),
            ]
        );
    }

    private static function sanitizeData(mixed $data): mixed
    {
        if (! is_array($data)) {
            return $data;
        }

        $flat = Arr::dot($data);
        foreach ($flat as $key => $value) {
            $lastSegment = strtolower((string) str($key)->afterLast('.'));
            if (in_array($lastSegment, self::SENSITIVE_KEYS, true)) {
                $flat[$key] = self::REDACTED;
            }
        }

        return Arr::undot($flat);
    }

    private static function storeFieldLevelDetails(ActivityLog $activityLog, mixed $oldData, mixed $newData): void
    {
        if (! is_array($oldData) && ! is_array($newData)) {
            return;
        }

        $oldFlat = is_array($oldData) ? Arr::dot(self::sanitizeData($oldData)) : [];
        $newFlat = is_array($newData) ? Arr::dot(self::sanitizeData($newData)) : [];
        $allFields = array_unique(array_merge(array_keys($oldFlat), array_keys($newFlat)));

        foreach ($allFields as $field) {
            $oldValue = $oldFlat[$field] ?? null;
            $newValue = $newFlat[$field] ?? null;
            if ($oldValue === $newValue) {
                continue;
            }

            ActivityLogDetail::create([
                'activity_log_id' => $activityLog->id,
                'field' => (string) $field,
                'old_value' => is_scalar($oldValue) || $oldValue === null ? (string) ($oldValue ?? '') : json_encode($oldValue, JSON_UNESCAPED_UNICODE),
                'new_value' => is_scalar($newValue) || $newValue === null ? (string) ($newValue ?? '') : json_encode($newValue, JSON_UNESCAPED_UNICODE),
            ]);
        }
    }
}
