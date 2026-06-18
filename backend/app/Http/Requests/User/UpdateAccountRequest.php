<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'name'  => ['sometimes', 'string', 'min:2', 'max:100'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[+0-9 ()\-]{6,30}$/'],
            'city'  => ['nullable', 'string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.min'  => 'El nombre debe tener al menos 2 caracteres.',
            'name.max'  => 'El nombre no puede tener más de 100 caracteres.',
            'email.email' => 'Introduce un email válido.',
            'email.unique' => 'Este email ya está en uso por otra cuenta.',
            'phone.max' => 'El teléfono no puede tener más de 30 caracteres.',
            'phone.regex' => 'El teléfono solo puede contener dígitos, espacios, paréntesis, guiones y un + inicial.',
            'city.max'  => 'La ciudad no puede tener más de 80 caracteres.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [];

        foreach (['phone', 'city'] as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $payload[$field] = null;
            }
        }

        if ($this->has('name') && is_string($this->input('name'))) {
            $payload['name'] = trim($this->input('name'));
        }

        if ($payload !== []) {
            $this->merge($payload);
        }
    }
}
