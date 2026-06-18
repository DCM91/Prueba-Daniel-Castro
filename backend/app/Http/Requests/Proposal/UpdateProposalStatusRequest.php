<?php

declare(strict_types=1);

namespace App\Http\Requests\Proposal;

use App\Enums\ProposalStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateProposalStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                Rule::in([ProposalStatus::Accepted->value, ProposalStatus::Rejected->value]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'El estado es obligatorio.',
            'status.in'       => 'Solo se permite aceptar o rechazar una propuesta.',
        ];
    }
}
