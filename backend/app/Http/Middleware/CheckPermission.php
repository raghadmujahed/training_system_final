<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, $permission)
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'message' => 'لا يمكن الوصول، يرجى تسجيل الدخول',
                'error' => 'Unauthenticated'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Check if user has a role
        if (!$user->role) {
            return response()->json([
                'message' => 'لا تملك صلاحية تنفيذ هذه العملية',
                'error' => 'No role assigned'
            ], Response::HTTP_FORBIDDEN);
        }

        // Check permission through role relationship
        $hasPermission = $user->role
            ->permissions()
            ->where('name', $permission)
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'message' => 'لا تملك صلاحية تنفيذ هذه العملية',
                'error' => 'Permission denied',
                'permission' => $permission
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}