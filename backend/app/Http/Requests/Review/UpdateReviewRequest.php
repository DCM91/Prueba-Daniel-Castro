<?php

declare(strict_types=1);

namespace App\Http\Requests\Review;

use App\Models\Review;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'rating'  => ['required', 'integer', 'between:'.Review::MIN_RATING.','.Review::MAX_RATING],
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'rating.required' => 'La puntuación es obligatoria.',
            'rating.between'  => 'La puntuación debe estar entre '.Review::MIN_RATING.' y '.Review::MAX_RATING.'.',
            'comment.max'     => 'El comentario no puede tener más de 1000 caracteres.',
        ];
    }
}
