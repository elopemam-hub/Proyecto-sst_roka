<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AlertaCertificadoMailable extends Mailable
{
    use Queueable, SerializesModels;

    public array $certificado;
    public bool $estaVencido;
    public int $dias;

    /**
     * Create a new message instance.
     */
    public function __construct(array $certificado, bool $estaVencido, int $dias)
    {
        $this->certificado = $certificado;
        $this->estaVencido = $estaVencido;
        $this->dias = $dias;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject(
            $this->estaVencido
                ? "⚠️ Certificado VENCIDO: {$this->certificado['nombre']}"
                : "🔔 Certificado por vencer: {$this->certificado['nombre']}"
        )->view('emails.alerta-certificado');
    }
}
