<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: {{ $estaVencido ? '#dc2626' : '#f59e0b' }}; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
                {{ $estaVencido ? '⚠️ Certificado VENCIDO' : '🔔 Certificado por vencer' }}
            </h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                {{ $estaVencido ? 'Atención:' : 'Recordatorio:' }} El siguiente certificado de operatividad requiere su atención inmediata.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; width: 40%;">Equipo:</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">{{ $certificado['nombre'] }}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold;">Código:</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">{{ $certificado['codigo'] }}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold;">Fecha de vencimiento:</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">{{ \Carbon\Carbon::parse($certificado['fecha_vencimiento'])->format('d/m/Y') }}</td>
                </tr>
            </table>

            <div style="background: {{ $estaVencido ? '#fee2e2' : '#fef3c7' }}; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: {{ $estaVencido ? '#dc2626' : '#f59e0b' }};">
                    {{ $estaVencido ? "⚠️ Venció hace {$dias} días" : "🔔 Vence en {$dias} días" }}
                </p>
            </div>

            <div style="text-align: center;">
                <a href="{{ config('app.url') }}/equipos/certificados/{{ $certificado['id'] }}"
                   style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Ver Certificado
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Este es un correo automático generado por el sistema SST ROKA.<br>
                Por favor no responda a este mensaje.
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
                &copy; {{ date('Y') }} SST ROKA - Sistema de Gestión de Seguridad y Salud en el Trabajo
            </p>
        </div>

    </div>
</body>
</html>
