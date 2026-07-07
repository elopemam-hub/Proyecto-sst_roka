<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta QR - {{ $equipo->codigo }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: 10cm 10cm;
            margin: 0;
        }

        body {
            font-family: 'Arial', sans-serif;
            width: 10cm;
            height: 10cm;
            padding: 0.8cm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 0.3cm;
            margin-bottom: 0.4cm;
        }

        .header h1 {
            font-size: 14pt;
            color: #1e40af;
            font-weight: bold;
            margin-bottom: 0.1cm;
        }

        .header p {
            font-size: 8pt;
            color: #64748b;
        }

        .qr-container {
            text-align: center;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .qr-container img {
            width: 4.5cm;
            height: 4.5cm;
            border: 2px solid #e2e8f0;
            border-radius: 0.3cm;
            padding: 0.2cm;
            background: white;
        }

        .info {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 0.3cm;
            padding: 0.4cm;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.15cm;
            font-size: 9pt;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-label {
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 7pt;
            letter-spacing: 0.5px;
        }

        .info-value {
            color: #1e293b;
            font-weight: bold;
            text-align: right;
        }

        .codigo-grande {
            font-size: 11pt;
            font-family: 'Courier New', monospace;
            color: #1e40af;
        }

        .footer {
            text-align: center;
            margin-top: 0.3cm;
            padding-top: 0.3cm;
            border-top: 1px solid #e2e8f0;
        }

        .footer p {
            font-size: 7pt;
            color: #94a3b8;
        }

        .scan-text {
            font-size: 8pt;
            color: #64748b;
            margin-top: 0.2cm;
            font-weight: 600;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SST ROKA</h1>
        <p>Sistema de Seguridad y Salud en el Trabajo</p>
    </div>

    <div class="qr-container">
        <img src="{{ $qrImageUrl }}" alt="Código QR">
        <p class="scan-text">📱 Escanea para inspeccionar</p>
    </div>

    <div class="info">
        <div class="info-row">
            <span class="info-label">Código</span>
            <span class="info-value codigo-grande">{{ $equipo->codigo }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Equipo</span>
            <span class="info-value">{{ Str::limit($equipo->nombre, 30) }}</span>
        </div>
        @if($equipo->area)
        <div class="info-row">
            <span class="info-label">Área</span>
            <span class="info-value">{{ $equipo->area->nombre }}</span>
        </div>
        @endif
        @if($equipo->catalogo && $equipo->catalogo->frecuencia_inspeccion)
        <div class="info-row">
            <span class="info-label">Inspección</span>
            <span class="info-value">{{ ucfirst($equipo->catalogo->frecuencia_inspeccion) }}</span>
        </div>
        @endif
    </div>

    <div class="footer">
        <p>{{ now()->format('d/m/Y H:i') }} • Generado automáticamente</p>
    </div>

    <script>
        // Auto-abrir diálogo de impresión
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
