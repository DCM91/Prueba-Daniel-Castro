<?php

declare(strict_types=1);

namespace App\Http\Requests\Brief;

use App\Enums\SkillCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateBriefRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'       => ['sometimes', 'string', 'min:5', 'max:120'],
            'description' => ['sometimes', 'string', 'min:20', 'max:4000'],
            'category'    => ['sometimes', 'string', Rule::in([
                SkillCategory::Photo->value,
                SkillCategory::Video->value,
                SkillCategory::Edit->value,
                SkillCategory::Content->value,
            ])],
            'city'        => ['nullable', 'string', 'max:80'],
            'budget_min'  => ['nullable', 'numeric', 'min:0'],
            'budget_max'  => ['nullable', 'numeric', 'min:0'],
            'deadline'    => ['nullable', 'date', 'after:today'],
        ];
    }
}
