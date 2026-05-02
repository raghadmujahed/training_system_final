<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->user()->role?->name;
        if (! in_array($role, ['admin', 'coordinator', 'training_coordinator'], true)) {
            return false;
        }
        if ($role === 'admin') {
            return true;
        }
        $announcement = $this->route('announcement');

        return $announcement && (int) $announcement->user_id === (int) $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'status' => 'nullable|in:draft,active,archived',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
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