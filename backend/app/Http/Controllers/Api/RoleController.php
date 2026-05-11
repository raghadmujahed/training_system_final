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
        $role->update($request->only('name'));
        if ($request->has('permissions')) {
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