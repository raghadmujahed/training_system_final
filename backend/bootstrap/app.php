<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\CheckFeatureFlag;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
    $middleware->api(prepend: [
        \Illuminate\Http\Middleware\HandleCors::class,
    ]);
    $middleware->api(append: [
        \App\Http\Middleware\LogActivityMiddleware::class,
    ]);
    $middleware->alias([
        'feature' => CheckFeatureFlag::class,
        'role' => RoleMiddleware::class,
    ]);
})
    ->withExceptions(function (Exceptions $exceptions) {
        // Ensure CORS headers are present on all error responses (prevents CORS errors masking real errors)
        $exceptions->respond(function ($response) {
            if (method_exists($response, 'headers')) {
                $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:5173');
                $response->headers->set('Access-Control-Allow-Credentials', 'true');
                $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->headers->set('Access-Control-Allow-Headers', '*');
            }
            return $response;
        });

        // Handle specific exceptions with proper CORS headers
        $exceptions->renderable(function (\Throwable $e, $request) {
            // Match any API request (paths starting with api/ or containing api/)
            if ($request->is('api/*') || str_starts_with($request->path(), 'api/')) {
                // Determine correct HTTP status code
                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    $status = 401;
                } elseif ($e instanceof \Illuminate\Auth\Access\AuthorizationException) {
                    $status = 403;
                } elseif ($e instanceof \Illuminate\Validation\ValidationException) {
                    $status = 422;
                } elseif ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
                    $status = $e->getStatusCode();
                } elseif (method_exists($e, 'getStatusCode')) {
                    $status = $e->getStatusCode();
                } else {
                    $status = 500;
                }

                // Log unexpected 500 errors for debugging
                if ($status >= 500) {
                    Log::error('API 500 Error', [
                        'url' => $request->fullUrl(),
                        'method' => $request->method(),
                        'exception' => get_class($e),
                        'message' => $e->getMessage(),
                        'file' => $e->getFile() . ':' . $e->getLine(),
                    ]);
                }

                // For ValidationException, return the validation errors
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    $response = response()->json([
                        'message' => $e->getMessage(),
                        'errors' => $e->errors(),
                    ], 422);
                } elseif ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    $response = response()->json([
                        'message' => 'Unauthenticated.',
                    ], 401);
                } else {
                    $response = response()->json([
                        'message' => $e->getMessage(),
                        'exception' => get_class($e),
                    ], $status);
                }
                $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:5173');
                $response->headers->set('Access-Control-Allow-Credentials', 'true');
                $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->headers->set('Access-Control-Allow-Headers', '*');
                return $response;
            }
        });
    })
    ->create();