<?php

declare(strict_types=1);

namespace App\Http\Requests\Freelancer;

use App\Enums\SkillLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SyncSkillsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'skills'                       => ['present', 'array', 'max:20'],
            'skills.*.skill_id'            => ['required', 'integer', 'exists:skills,id'],
            'skills.*.level'               => ['required', 'string', Rule::enum(SkillLevel::class)],
            'skills.*.years_experience'    => ['required', 'integer', 'min:0', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'skills.max'                    => 'No puedes añadir más de 20 skills.',
            'skills.*.skill_id.exists'      => 'La skill seleccionada no existe.',
            'skills.*.level.in'             => 'El nivel debe ser junior, mid o senior.',
            'skills.*.years_experience.min' => 'Los años de experiencia no pueden ser negativos.',
            'skills.*.years_experience.max' => 'Los años de experiencia no pueden superar 50.',
        ];
    }
}
