<?php

declare(strict_types=1);

namespace App\Http\Requests\Freelancer;

use App\Enums\SkillCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SearchFreelancersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q'        => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', Rule::in([
                SkillCategory::Photo->value,
                SkillCategory::Video->value,
                SkillCategory::Edit->value,
                SkillCategory::Content->value,
            ])],
            'city'     => ['nullable', 'string', 'max:80'],
            'max_rate' => ['nullable', 'numeric', 'min:0'],
            'page'     => ['nullable', 'integer', 'min:1'],
            'sort'     => ['nullable', 'string', Rule::in(['featured', 'price_asc', 'price_desc', 'recent'])],
        ];
    }

    public function messages(): array
    {
        return [
            'category.in' => 'La categoria debe ser photo, video, edit o content.',
        ];
    }
}
