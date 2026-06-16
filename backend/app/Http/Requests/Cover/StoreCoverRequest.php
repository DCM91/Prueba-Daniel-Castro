<?php

declare(strict_types=1);

namespace App\Http\Requests\Cover;

use Illuminate\Foundation\Http\FormRequest;

final class StoreCoverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'public_id' => ['required', 'string', 'max:191', 'regex:/^[A-Za-z0-9_\-\/]+$/'],
            'url'       => ['required', 'url', 'max:500'],
            'width'     => ['nullable', 'integer', 'min:1', 'max:10000'],
            'height'    => ['nullable', 'integer', 'min:1', 'max:10000'],
            'format'    => ['nullable', 'string', 'in:jpg,jpeg,png,webp'],
            'bytes'     => ['nullable', 'integer', 'min:0', 'max:10485760'],
        ];
    }

    public function messages(): array
    {
        return [
            'public_id.required' => 'El public_id es obligatorio.',
            'public_id.regex'    => 'El public_id tiene un formato inválido.',
            'url.required'       => 'La URL es obligatoria.',
            'url.url'            => 'La URL no es válida.',
            'bytes.max'          => 'La imagen no puede pesar más de 10 MB.',
        ];
    }
}
