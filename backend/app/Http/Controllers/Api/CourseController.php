<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Course::class, 'course');
    }

    public function index(Request $request)
    {
        $query = Course::with('department')->withCount('sections');
        
        // For head_of_department, only show courses from their department
        if ($request->user()->role?->name === 'head_of_department' && $request->user()->department_id) {
            $query->where('department_id', $request->user()->department_id);
        } elseif ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        
        if ($request->has('type')) $query->where('type', $request->type);
        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('code', 'like', '%'.$request->search.'%')
                  ->orWhere('name', 'like', '%'.$request->search.'%');
            });
        }
        $courses = $query->paginate($request->per_page ?? 15);
        return CourseResource::collection($courses);
    }

    public function store(StoreCourseRequest $request)
    {
        $course = Course::create($request->validated());
        return new CourseResource($course);
    }

    public function show(Course $course)
    {
        return new CourseResource($course->load('sections'));
    }

    public function update(UpdateCourseRequest $request, Course $course)
    {
        $course->fill($request->validated());
        if (!$course->isDirty()) {
            return response()->json(['status' => 'no_changes', 'message' => 'لم تقم بتغيير أي بيانات']);
        }
        $course->save();
        return new CourseResource($course);
    }

    public function destroy(Course $course)
    {
        $this->authorize('delete', $course);
        
        $course->delete();
        return response()->json(['message' => 'تم حذف المساق']);
    }
    
    public function archive(Course $course)
    {
        $this->authorize('archive', $course);
        
        // Soft delete (archive) the course - it has sections
        $course->delete();
        
        return response()->json(['message' => 'تم أرشفة المساق بنجاح']);
    }
}