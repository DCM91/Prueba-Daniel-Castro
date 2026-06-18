<?php

declare(strict_types=1);

namespace App\Http\Requests\Brief;

use Illuminate\Foundation\Http\FormRequest;

final class ReorderBriefAttachmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'ids'   => ['required', 'array', 'min:1', 'max:50'],
            'ids.*' => ['integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'ids.required' => 'La lista de IDs es obligatoria.',
            'ids.array'    => 'La lista de IDs debe ser un array.',
            'ids.max'      => 'No puedes reordenar más de 50 imágenes a la vez.',
        ];
    }
}
