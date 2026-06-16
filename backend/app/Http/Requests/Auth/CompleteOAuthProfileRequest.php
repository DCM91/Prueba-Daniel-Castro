<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CompleteOAuthProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => [
                'required',
                'string',
                Rule::in([UserRole::Client->value, UserRole::Freelancer->value]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'role.in' => 'Solo se permite completar el perfil como cliente o freelancer.',
        ];
    }
}
