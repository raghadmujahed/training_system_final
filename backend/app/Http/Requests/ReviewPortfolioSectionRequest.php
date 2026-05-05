<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewPortfolioSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'entry_id' => 'required|exists:portfolio_entries,id',
            'status' => 'required|in:reviewed,needs_revision',
            'reviewer_note' => 'nullable|string|max:2000',
            'academic_rating' => 'nullable|integer|min:1|max:5',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $status = $this->input('status');
            $note = trim((string) $this->input('reviewer_note', ''));
            $rating = $this->input('academic_rating');

            if ($status === 'needs_revision' && $note === '') {
                $validator->errors()->add('reviewer_note', 'يرجى توضيح سبب الحاجة إلى التعديل.');

                return;
            }

            if ($status === 'reviewed' && $note === '' && ($rating === null || $rating === '')) {
                $validator->errors()->add('academic_rating', 'يرجى إدخال تقييم من 1 إلى 5 أو ملاحظة نصية.');
            }
        });
    }
}
