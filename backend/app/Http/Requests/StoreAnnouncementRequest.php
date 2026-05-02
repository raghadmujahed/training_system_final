<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role?->name, ['admin', 'coordinator', 'training_coordinator'], true);
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'status' => 'nullable|in:draft,active,archived',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:published_at',
            'all_students' => 'nullable|boolean',
            'target_roles' => 'nullable|array',
            'target_roles.*' => 'exists:roles,id',
            'target_users' => 'nullable|array',
            'target_users.*' => 'exists:users,id',
            'target_departments' => 'nullable|array',
            'target_departments.*' => 'exists:departments,id',
        ];
    }
}