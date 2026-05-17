<?php

namespace App\Support;

use App\Models\Department;

class AcademicMajors
{
    /** أصول التربية — بكالوريوس أساليب التدريس (معلم مرحلة أساسية) */
    public const USOOL_TARBIAH = [
        'معلم مرحلة أساسية دنيا (الصفوف من الأول إلى الرابع)',
        'معلم مرحلة أساسية عليا - تعليم اللغة العربية',
        'معلم مرحلة أساسية عليا - تعليم الرياضيات',
        'معلم مرحلة أساسية عليا - تعليم العلوم',
        'معلم مرحلة أساسية عليا - تعليم اللغة الإنجليزية',
        'معلم مرحلة أساسية عليا - تعليم التربية الإسلامية',
        'معلم مرحلة أساسية عليا - تعليم التكنولوجيا',
    ];

    public const PSYCHOLOGY = [
        'التوجيه التربوي والإرشاد النفسي',
    ];

    /** تخصصات قديمة — للتوافق مع بيانات سابقة */
    public const LEGACY = [
        'علم نفس',
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
    ];

    public const LIST = [
        ...self::USOOL_TARBIAH,
        ...self::PSYCHOLOGY,
        ...self::LEGACY,
    ];

    public const BY_DEPARTMENT = [
        'usool_tarbiah' => self::USOOL_TARBIAH,
        'psychology' => self::PSYCHOLOGY,
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
