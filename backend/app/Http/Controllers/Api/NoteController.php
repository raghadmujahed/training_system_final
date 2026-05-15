<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNoteRequest;
use App\Http\Requests\UpdateNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use App\Models\Notification;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Note::class, 'note');
    }

    public function index(Request $request)
    {
        $query = Note::with([
            'user',
            'trainingAssignment.enrollment.user',
            'trainingAssignment.trainingSite',
        ]);
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('training_assignment_id')) {
            $query->where('training_assignment_id', $request->training_assignment_id);
        }

        $user = $request->user();
        $role = $user->role?->name;
        if ($role === 'student') {
            $query->whereHas('trainingAssignment.enrollment', fn ($q) => $q->where('user_id', $user->id));
        } elseif (in_array($role, ['teacher', 'psychologist', 'field_supervisor', 'adviser'], true)) {
            $uid = $user->id;
            $query->whereHas('trainingAssignment', function ($q) use ($uid) {
                $q->where('teacher_id', $uid)->orWhere('field_supervisor_id', $uid);
            });
        } elseif ($role === 'academic_supervisor') {
            $query->whereHas('trainingAssignment', function ($q) use ($user) {
                $q->where('academic_supervisor_id', $user->id)
                    ->orWhereHas('enrollment.section', fn ($s) => $s->where('academic_supervisor_id', $user->id));
            });
        }

        $notes = $query->latest()->paginate($request->per_page ?? 15);

        return NoteResource::collection($notes);
    }

    public function store(StoreNoteRequest $request)
    {
        $note = Note::create($request->validated());
        $note->load(['trainingAssignment.enrollment.user', 'trainingAssignment.trainingSite']);

        // إرسال إشعار للطالب
        $studentId = $note->trainingAssignment?->enrollment?->user_id;
        $authorName = $request->user()?->name ?? 'المشرف';
        if ($studentId && $studentId !== $request->user()->id) {
            $preview = mb_strlen($note->content) > 60 ? mb_substr($note->content, 0, 60) . '...' : $note->content;
            Notification::create([
                'user_id' => $studentId,
                'type' => 'note_added',
                'message' => "ملاحظة جديدة من {$authorName}: {$preview}",
                'data' => ['note_id' => $note->id, 'training_assignment_id' => $note->training_assignment_id],
            ]);
        }

        return new NoteResource($note);
    }

    public function show(Note $note)
    {
        $note->load(['trainingAssignment.enrollment.user', 'trainingAssignment.trainingSite', 'user']);

        return new NoteResource($note);
    }

    public function update(UpdateNoteRequest $request, Note $note)
    {
        $note->update($request->validated());
        $note->load(['trainingAssignment.enrollment.user', 'trainingAssignment.trainingSite', 'user']);

        return new NoteResource($note);
    }

    public function destroy(Note $note)
    {
        $note->delete();
        return response()->json(['message' => 'تم حذف الملاحظة']);
    }
}