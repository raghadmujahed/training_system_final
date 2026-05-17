<?php

namespace App\Support;

use App\Models\Department;

class AcademicMajors
{
    public const LIST = [
        'رياضيات',
        'لغة عربية',
        'تربية إسلامية',
        'لغة إنجليزية',
        'علم نفس',
        'علوم',
        'فيزياء',
        'كيمياء',
        'أحياء',
        'تربية خاصة',
        'رياض أطفال',
        'حاسوب',
    ];

    public const BY_DEPARTMENT = [
        'usool_tarbiah' => [
            'رياضيات',
            'لغة عربية',
            'تربية إسلامية',
            'لغة إنجليزية',
            'علوم',
            'فيزياء',
            'كيمياء',
            'أحياء',
            'تربية خاصة',
            'رياض أطفال',
            'حاسوب',
        ],
        'psychology' => [
            'علم نفس',
        ],
        'administration' => [],
    ];

    public static function all(): array
    {
        return self::LIST;
    }

    public static function forDepartmentName(?string $departmentName): array
    {
        if ($departmentName === null || $departmentName === '') {
            return [];
        }

        return self::BY_DEPARTMENT[trim($departmentName)] ?? [];
    }

    public static function forDepartmentId(?int $departmentId): array
    {
        if (! $departmentId) {
            return [];
        }

        $department = Department::query()->find($departmentId);

        return $department
            ? self::forDepartmentName($department->name)
            : [];
    }

    public static function isValid(?string $major): bool
    {
        if ($major === null || $major === '') {
            return false;
        }

        if (str_contains($major, '@')) {
            return false;
        }

        return in_array($major, self::LIST, true);
    }

    public static function isValidForDepartment(?string $major, ?int $departmentId): bool
    {
        if (! self::isValid($major) || ! $departmentId) {
            return false;
        }

        return in_array($major, self::forDepartmentId($departmentId), true);
    }

    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);
        if ($value === '' || str_contains($value, '@')) {
            return null;
        }

        if (in_array($value, self::LIST, true)) {
            return $value;
        }

        foreach (self::LIST as $major) {
            if (mb_strtolower($major) === mb_strtolower($value)) {
                return $major;
            }
        }

        return null;
    }
}
