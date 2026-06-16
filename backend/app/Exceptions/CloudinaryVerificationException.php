<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class CloudinaryVerificationException extends RuntimeException
{
    public function __construct(string $message = 'Recurso de Cloudinary no verificado.', ?Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
