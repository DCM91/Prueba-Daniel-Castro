<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

final class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'min:2', 'max:100'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'role'     => ['required', 'string', Rule::in(UserRole::selfRegistrable())],
        ];
    }

    public function messages(): array
    {
        return [
            'role.in' => 'Solo se permite registrarse como cliente o freelancer. Los demás roles los asigna un administrador.',
        ];
    }
}
