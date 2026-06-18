<?php

declare(strict_types=1);

namespace App\Http\Requests\Portfolio;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePortfolioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title'       => ['sometimes', 'required', 'string', 'min:1', 'max:120'],
            'description' => ['sometimes', 'required', 'string', 'min:1', 'max:500'],
            'position'    => ['nullable', 'integer', 'min:0', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required'     => 'El título es obligatorio.',
            'title.min'          => 'El título no puede estar vacío.',
            'title.max'          => 'El título no puede tener más de 120 caracteres.',
            'description.required' => 'La descripción es obligatoria.',
            'description.min'    => 'La descripción no puede estar vacía.',
            'description.max'    => 'La descripción no puede tener más de 500 caracteres.',
        ];
    }
}
