<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Role::class, 'role');
    }

    public function index(Request $request)
    {
        $roles = Role::withCount('permissions')->with('permissions')->paginate($request->per_page ?? 15);
        return RoleResource::collection($roles);
    }

    public function store(StoreRoleRequest $request)
    {
        $role = Role::create($request->validated());
        return new RoleResource($role);
    }

    public function show(Role $role)
    {
        return new RoleResource($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role)
    {
        $nameChanged = false;
        $permissionsChanged = false;

        // Check name change
        $role->fill($request->only('name'));
        if ($role->isDirty('name')) {
            $nameChanged = true;
        }

        // Check permissions change
        if ($request->has('permissions')) {
            $currentIds = $role->permissions()->pluck('permissions.id')->sort()->values()->toArray();
            $newIds = collect($request->permissions)->sort()->values()->toArray();
            $permissionsChanged = $currentIds !== $newIds;
        }

        if (!$nameChanged && !$permissionsChanged) {
            return response()->json(['status' => 'no_changes', 'message' => 'لم تقم بتغيير أي بيانات']);
        }

        if ($nameChanged) {
            $role->save();
        }
        if ($permissionsChanged) {
            $role->permissions()->sync($request->permissions);
        }
        return new RoleResource($role->load('permissions'));
    }

    public function destroy(Role $role)
    {
        $role->delete();
        return response()->json(['message' => 'تم حذف الدور']);
    }
}