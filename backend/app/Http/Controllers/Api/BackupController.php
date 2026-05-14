<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateBackupRequest;
use App\Models\Backup;
use Illuminate\Http\Request;
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
        // Raise memory limit for large databases
        @ini_set('memory_limit', '512M');
        @set_time_limit(300);

        try {
            // توليد اسم الملف
            $filename = 'backup_' . date('Ymd_His') . '_' . Str::random(8) . '.sql';

            // استخدام مجلد storage/app/backups (يعمل على Railway بدون symlink)
            $backupDir = storage_path('app/backups');
            if (!is_dir($backupDir)) {
                if (!mkdir($backupDir, 0755, true) && !is_dir($backupDir)) {
                    return response()->json([
                        'message' => 'فشل إنشاء مجلد النسخ الاحتياطية — تأكد من صلاحيات الكتابة على storage/',
                    ], 500);
                }
            }

            if (!is_writable($backupDir)) {
                return response()->json([
                    'message' => 'مجلد النسخ الاحتياطية غير قابل للكتابة — تحقق من صلاحيات المجلد',
                ], 500);
            }

            $fullPath = $backupDir . DIRECTORY_SEPARATOR . $filename;

            // إنشاء محتوى SQL عبر Laravel DB facade (بدون mysqldump) — يعمل على Railway
            $this->writeDatabaseDump($fullPath);

            if (!file_exists($fullPath) || filesize($fullPath) === 0) {
                return response()->json([
                    'message' => 'فشل إنشاء النسخة الاحتياطية: الملف فارغ أو لم يُنشأ',
                ], 500);
            }

            $backup = Backup::create([
                'user_id'   => $request->user()->id,
                'type'      => $request->type ?? 'full',
                'name'      => $filename,
                'file_path' => $fullPath,
                'size'      => filesize($fullPath),
                'status'    => 'completed',
                'notes'     => $request->notes,
            ]);

            return response()->json([
                'backup'       => $backup,
                'download_url' => url('/api/backups/' . $backup->id . '/download'),
            ], 201);

        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Backup DB error: ' . $e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return response()->json([
                'message' => 'فشل الاتصال بقاعدة البيانات أثناء إنشاء النسخة الاحتياطية',
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Backup creation failed: ' . $e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return response()->json([
                'message' => 'فشل إنشاء النسخة الاحتياطية: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Write SQL dump directly to file using chunked queries to avoid memory exhaustion.
     * Works on Railway without mysqldump — reads DB_* credentials from env automatically.
     */
    private function writeDatabaseDump(string $filePath): void
    {
        $connection = config('database.default');
        $db = config("database.connections.{$connection}.database");

        $handle = fopen($filePath, 'w');
        if ($handle === false) {
            throw new \RuntimeException("لا يمكن فتح الملف للكتابة: {$filePath}");
        }

        try {
            fwrite($handle, "-- Database Backup: {$db}\n");
            fwrite($handle, "-- Generated: " . date('Y-m-d H:i:s') . "\n");
            fwrite($handle, "-- Connection: {$connection}\n\n");
            fwrite($handle, "SET FOREIGN_KEY_CHECKS=0;\n\n");

            // SHOW TABLES returns stdClass with a dynamic property per connection
            $tables = \DB::select('SHOW TABLES');

            foreach ($tables as $tableRow) {
                $vars      = get_object_vars($tableRow);
                $tableName = array_values($vars)[0];

                fwrite($handle, "-- ----------------------------\n");
                fwrite($handle, "-- Table: `{$tableName}`\n");
                fwrite($handle, "-- ----------------------------\n");
                fwrite($handle, "DROP TABLE IF EXISTS `{$tableName}`;\n");

                // CREATE TABLE statement
                $createResult = \DB::select("SHOW CREATE TABLE `{$tableName}`");
                if (!empty($createResult)) {
                    $createVars = get_object_vars($createResult[0]);
                    $createStmt = array_values($createVars)[1] ?? '';
                    fwrite($handle, $createStmt . ";\n\n");
                }

                // INSERT rows in chunks of 500 to avoid memory exhaustion
                $offset = 0;
                $chunkSize = 500;
                $hasRows = false;

                while (true) {
                    $rows = \DB::select("SELECT * FROM `{$tableName}` LIMIT {$chunkSize} OFFSET {$offset}");
                    if (empty($rows)) {
                        break;
                    }

                    if (!$hasRows) {
                        fwrite($handle, "LOCK TABLES `{$tableName}` WRITE;\n");
                        $hasRows = true;
                    }

                    foreach ($rows as $row) {
                        $values = [];
                        foreach ((array) $row as $value) {
                            if ($value === null) {
                                $values[] = 'NULL';
                            } else {
                                $escaped = str_replace(
                                    ["\\", "'", "\n", "\r", "\0"],
                                    ["\\\\", "\\'", "\\n", "\\r", "\\0"],
                                    (string) $value
                                );
                                $values[] = "'{$escaped}'";
                            }
                        }
                        fwrite($handle, "INSERT INTO `{$tableName}` VALUES (" . implode(', ', $values) . ");\n");
                    }

                    $offset += $chunkSize;

                    // Free memory after each chunk
                    unset($rows);
                }

                if ($hasRows) {
                    fwrite($handle, "UNLOCK TABLES;\n\n");
                }
            }

            fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
        } finally {
            fclose($handle);
        }
    }

    public function show($id)
    {
        $backup = Backup::with('user')->findOrFail($id);
        $tables = [];

        // Try to parse SQL file to extract table names
        if ($backup->file_path && file_exists($backup->file_path)) {
            $content = file_get_contents($backup->file_path);
            $fileSize = strlen($content);
            
            // Extract CREATE TABLE statements - handle multi-line definitions
            $pattern = '/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`\']?([a-zA-Z0-9_]+)[`\']?\s*\(([^;]+)\);/is';
            preg_match_all($pattern, $content, $matches);
            
            if (!empty($matches[1])) {
                foreach ($matches[1] as $index => $tableName) {
                    $tableDefinition = $matches[2][$index] ?? '';
                    
                    // Count columns by splitting definition
                    // Remove comments first
                    $cleanDefinition = preg_replace('/--.*$/m', '', $tableDefinition);
                    $cleanDefinition = preg_replace('/\/\*.*?\*\//s', '', $cleanDefinition);
                    
                    // Split by comma at the top level (not inside parentheses)
                    $columns = $this->extractColumns($cleanDefinition);
                    
                    // Count INSERT statements for this table
                    preg_match_all('/INSERT\s+INTO\s+[`\']?' . preg_quote($tableName, '/') . '[`\']?\s*\(/i', $content, $insertMatches);
                    
                    $tables[] = [
                        'name' => $tableName,
                        'columns_count' => count($columns),
                        'rows_count' => count($insertMatches[0] ?? []),
                    ];
                }
            } else {
                // If no CREATE TABLE found, try to find tables from INSERT statements
                if ($fileSize > 0) {
                    preg_match_all('/INSERT\s+INTO\s+[`\']?([a-zA-Z0-9_]+)[`\']?\s*\(/i', $content, $insertTables);
                    if (!empty($insertTables[1])) {
                        $uniqueTables = array_unique($insertTables[1]);
                        foreach ($uniqueTables as $tableName) {
                            preg_match_all('/INSERT\s+INTO\s+[`\']?' . preg_quote($tableName, '/') . '[`\']?\s*\(/i', $content, $countMatches);
                            $tables[] = [
                                'name' => $tableName,
                                'columns_count' => 0,
                                'rows_count' => count($countMatches[0] ?? []),
                            ];
                        }
                    }
                }
            }
        }

        return response()->json([
            'id'          => $backup->id,
            'name'        => $backup->name,
            'created_at'  => $backup->created_at,
            'size'        => $backup->size,
            'type'        => $backup->type,
            'notes'       => $backup->notes,
            'user'        => $backup->user,
            'tables'      => $tables,
            'file_exists' => $backup->file_path && file_exists($backup->file_path),
        ]);
    }

    /**
     * Helper method to extract columns from table definition
     */
    private function extractColumns($definition)
    {
        $columns = [];
        $depth = 0;
        $current = '';
        
        for ($i = 0; $i < strlen($definition); $i++) {
            $char = $definition[$i];
            
            if ($char === '(') {
                $depth++;
                $current .= $char;
            } elseif ($char === ')') {
                $depth--;
                $current .= $char;
            } elseif ($char === ',' && $depth === 0) {
                $trimmed = trim($current);
                // Skip constraint definitions
                if (!empty($trimmed) && 
                    !preg_match('/^(PRIMARY|FOREIGN|UNIQUE|INDEX|KEY|CONSTRAINT)/i', $trimmed)) {
                    $columns[] = $trimmed;
                }
                $current = '';
            } else {
                $current .= $char;
            }
        }
        
        // Add last column
        $trimmed = trim($current);
        if (!empty($trimmed) && 
            !preg_match('/^(PRIMARY|FOREIGN|UNIQUE|INDEX|KEY|CONSTRAINT)/i', $trimmed)) {
            $columns[] = $trimmed;
        }
        
        return $columns;
    }

    public function getTableData($id, $tableName)
    {
        $backup = Backup::findOrFail($id);

        if (!$backup->file_path || !file_exists($backup->file_path)) {
            return response()->json(['message' => 'ملف النسخة غير موجود'], 404);
        }

        $content = file_get_contents($backup->file_path);

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
        if ($backup->file_path && file_exists($backup->file_path)) {
            @unlink($backup->file_path);
        }
        $backup->delete();
        return response()->json(['message' => 'تم حذف النسخة الاحتياطية']);
    }

    public function restore(Request $request, $backup_id)
    {
        // Only admin can restore
        if ($request->user()->role?->name !== 'admin') {
            return response()->json(['message' => 'صلاحية مسؤول النظام مطلوبة لتنفيذ هذه العملية'], 403);
        }

        $backup = Backup::findOrFail($backup_id);

        if (!$backup->file_path || !file_exists($backup->file_path)) {
            return response()->json(['message' => 'ملف النسخة الاحتياطية غير موجود'], 404);
        }

        // Restore by executing SQL statements via Laravel DB facade (no mysql CLI needed)
        try {
            $sql = file_get_contents($backup->file_path);
            // Split on statement boundaries and execute each
            $statements = array_filter(
                array_map('trim', explode(";
", $sql)),
                fn($s) => strlen($s) > 0 && !str_starts_with(ltrim($s), '--')
            );
            \DB::beginTransaction();
            foreach ($statements as $statement) {
                \DB::statement($statement);
            }
            \DB::commit();
            return response()->json(['message' => 'تم استعادة النسخة الاحتياطية بنجاح']);
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Backup restore failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل استعادة النسخة الاحتياطية، يرجى التحقق من الملف'], 500);
        }
    }

    public function download(Request $request, $id)
    {
        // Only admin can download
        if ($request->user()->role?->name !== 'admin') {
            return response()->json(['message' => 'صلاحية مسؤول النظام مطلوبة لتنفيذ هذه العملية'], 403);
        }

        try {
            $backup = Backup::findOrFail($id);

            if (!$backup->file_path || !file_exists($backup->file_path)) {
                return response()->json(['message' => 'ملف النسخة غير موجود على الخادم'], 404);
            }

            return response()->download($backup->file_path, $backup->name ?? basename($backup->file_path));
        } catch (\Exception $e) {
            \Log::error('Backup download failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل تحميل النسخة الاحتياطية'], 500);
        }
    }
}