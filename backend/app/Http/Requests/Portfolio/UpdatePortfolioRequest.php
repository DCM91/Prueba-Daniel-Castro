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
            'title'       => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'position'    => ['nullable', 'integer', 'min:0', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.max'       => 'El título no puede tener más de 120 caracteres.',
            'description.max' => 'La descripción no puede tener más de 500 caracteres.',
        ];
    }
}
