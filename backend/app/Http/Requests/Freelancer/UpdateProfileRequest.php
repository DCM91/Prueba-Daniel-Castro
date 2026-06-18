<?php

declare(strict_types=1);

namespace App\Http\Requests\Freelancer;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'display_name'      => ['nullable', 'string', 'max:100'],
            'bio'               => ['nullable', 'string', 'max:1000'],
            'hourly_rate'       => ['nullable', 'numeric', 'min:0'],
            'price_per_project' => ['nullable', 'numeric', 'min:0'],
            'is_available'      => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'display_name.max'      => 'El nombre público no puede tener más de 100 caracteres.',
            'bio.max'               => 'La bio no puede tener más de 1000 caracteres.',
            'hourly_rate.numeric'   => 'La tarifa por hora debe ser un número.',
            'hourly_rate.min'       => 'La tarifa por hora no puede ser negativa.',
            'price_per_project.numeric' => 'El precio por proyecto debe ser un número.',
            'price_per_project.min' => 'El precio por proyecto no puede ser negativo.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [];

        foreach (['display_name', 'bio'] as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $payload[$field] = null;
            }
        }

        if ($payload !== []) {
            $this->merge($payload);
        }
    }
}
