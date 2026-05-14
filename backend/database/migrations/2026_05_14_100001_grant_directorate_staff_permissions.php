<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Role;
use App\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        $perms = Permission::whereIn('name', [
            'training_sites.staff.assign',
            'training_sites.staff.transfer',
            'training_sites.staff.remove',
        ])->get();

        foreach (['education_directorate', 'health_directorate'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->permissions()->syncWithoutDetaching($perms);
            }
        }
    }

    public function down(): void
    {
        $perms = Permission::whereIn('name', [
            'training_sites.staff.assign',
            'training_sites.staff.transfer',
            'training_sites.staff.remove',
        ])->pluck('id');

        foreach (['education_directorate', 'health_directorate'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->permissions()->detach($perms);
            }
        }
    }
};
