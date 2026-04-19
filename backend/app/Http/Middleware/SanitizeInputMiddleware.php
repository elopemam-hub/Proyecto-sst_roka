<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInputMiddleware
{
    // Campos que nunca se tocan (contraseñas, tokens, JSONs crudos)
    private array $except = ['password', 'password_confirmation', 'token', 'datos_json'];

    public function handle(Request $request, Closure $next): Response
    {
        $input = $request->except($this->except);
        $this->clean($input);
        $request->merge($input);

        return $next($request);
    }

    private function clean(array &$data): void
    {
        foreach ($data as $key => &$value) {
            if (is_array($value)) {
                $this->clean($value);
            } elseif (is_string($value)) {
                // Strip tags y trim — no se aplica strip_tags en campos de texto enriquecido
                $value = trim(strip_tags($value));
            }
        }
    }
}
