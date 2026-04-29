<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateBackupRequest;
use App\Http\Requests\RestoreBackupRequest;
use App\Models\Backup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BackupController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Backup::class, 'backup');
    }

    public function index(Request $request)
    {
        $backups = Backup::with('user')->latest()->paginate($request->per_page ?? 15);
        return response()->json($backups);
    }

    public function store(CreateBackupRequest $request)
    {
        // توليد اسم الملف
        $filename = 'backup_' . date('Ymd_His') . '_' . Str::random(8) . '.sql';
        $filepath = 'backups/' . $filename;
        
        // تنفيذ أمر mysqldump (تأكد من وجوده في المسار)
        $db = config('database.connections.mysql.database');
        $user = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');
        $host = config('database.connections.mysql.host');
        
        $command = sprintf('mysqldump --user=%s --password=%s --host=%s %s > %s', 
            escapeshellarg($user), escapeshellarg($password), escapeshellarg($host), 
            escapeshellarg($db), escapeshellarg(storage_path('app/' . $filepath)));
        system($command, $output);
        
        $backup = Backup::create([
            'user_id' => $request->user()->id,
            'type' => $request->type,
            'name' => $filename,
            'file_path' => $filepath,
            'size' => Storage::exists($filepath) ? Storage::size($filepath) : 0,
            'status' => 'completed',
            'notes' => $request->notes,
        ]);
        
        return response()->json($backup, 201);
    }

    public function show($id)
    {
        $backup = Backup::with('user')->findOrFail($id);
        $tables = [];

        // Try to parse SQL file to extract table names
        if ($backup->file_path && Storage::exists($backup->file_path)) {
            $content = Storage::get($backup->file_path);
            $fileSize = strlen($content);
            
            // Extract CREATE TABLE statements - handle various formats
            preg_match_all('/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`\']?([a-zA-Z0-9_]+)[`\']?\s*\(/i', $content, $matches);
            
            if (!empty($matches[1])) {
                foreach ($matches[1] as $tableName) {
                    // Count INSERT statements for this table - more flexible pattern
                    preg_match_all('/INSERT\s+INTO\s+[`\']?' . preg_quote($tableName, '/') . '[`\']?\s*\(/i', $content, $insertMatches);
                    $tables[] = [
                        'name' => $tableName,
                        'count' => count($insertMatches[0] ?? []),
                    ];
                }
            } else {
                // If no CREATE TABLE found, try alternative patterns
                // Check if file has any content
                if ($fileSize > 0) {
                    // Try to find INSERT statements directly
                    preg_match_all('/INSERT\s+INTO\s+[`\']?([a-zA-Z0-9_]+)[`\']?\s*\(/i', $content, $insertTables);
                    if (!empty($insertTables[1])) {
                        $uniqueTables = array_unique($insertTables[1]);
                        foreach ($uniqueTables as $tableName) {
                            preg_match_all('/INSERT\s+INTO\s+[`\']?' . preg_quote($tableName, '/') . '[`\']?\s*\(/i', $content, $countMatches);
                            $tables[] = [
                                'name' => $tableName,
                                'count' => count($countMatches[0] ?? []),
                            ];
                        }
                    }
                }
            }
        }

        return response()->json([
            'id' => $backup->id,
            'name' => $backup->name,
            'created_at' => $backup->created_at,
            'size' => $backup->size,
            'type' => $backup->type,
            'notes' => $backup->notes,
            'user' => $backup->user,
            'tables' => $tables,
            'file_exists' => $backup->file_path && Storage::exists($backup->file_path),
            'file_path' => $backup->file_path,
        ]);
    }

    public function getTableData($id, $tableName)
    {
        $backup = Backup::findOrFail($id);

        if (!$backup->file_path || !Storage::exists($backup->file_path)) {
            return response()->json(['message' => 'ملف النسخة غير موجود'], 404);
        }

        $content = Storage::get($backup->file_path);

        // Extract INSERT statements for this table and parse them
        $pattern = '/INSERT INTO\s+[`\']?' . preg_quote($tableName, '/') . '[`\']?\s*\(([^)]+)\)\s*VALUES/i';
        preg_match_all($pattern, $content, $matches);

        $rows = [];
        if (!empty($matches[1])) {
            // Extract column names from the first INSERT statement
            $columnNames = array_map('trim', explode(',', $matches[1][0]));
            
            foreach ($matches[1] as $valuesString) {
                // Extract VALUES part
                $valuesPattern = '/INSERT INTO\s+[`\']?' . preg_quote($tableName, '/') . '[`\']?\s*\([^)]+\)\s*VALUES\s*\(([^)]+)\)/i';
                preg_match($valuesPattern, $content, $valueMatch);
                
                if (!empty($valueMatch[1])) {
                    // Parse values
                    $values = array_map('trim', explode(',', $valueMatch[1]));
                    $row = [];
                    
                    foreach ($columnNames as $idx => $colName) {
                        $colName = trim($colName, '`\'"');
                        if (isset($values[$idx])) {
                            $val = trim($values[$idx]);
                            // Remove quotes
                            $val = preg_replace('/^[\'"`]+|[\'"`]+$/', '', $val);
                            // Handle NULL values
                            if (strtoupper($val) === 'NULL') {
                                $val = null;
                            }
                            $row[$colName] = $val;
                        }
                    }
                    $rows[] = $row;
                }
            }
        }

        return response()->json([
            'data' => $rows,
            'count' => count($rows),
            'columns' => !empty($rows) ? array_keys($rows[0]) : [],
        ]);
    }

    public function destroy(Backup $backup)
    {
        Storage::delete($backup->file_path);
        $backup->delete();
        return response()->json(['message' => 'تم حذف النسخة الاحتياطية']);
    }

    public function restore(Request $request, $backup_id)
    {
        $backup = Backup::findOrFail($backup_id);
        $filepath = storage_path('app/' . $backup->file_path);

        // تنفيذ استعادة (mysql)
        $db = config('database.connections.mysql.database');
        $user = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');
        $command = sprintf('mysql --user=%s --password=%s %s < %s',
            escapeshellarg($user), escapeshellarg($password), escapeshellarg($db), escapeshellarg($filepath));
        system($command, $output);

        return response()->json(['message' => 'تم استعادة النسخة الاحتياطية بنجاح']);
    }
}