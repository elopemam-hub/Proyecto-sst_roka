<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiquetas QR - Batch</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 1cm;
        }

        body {
            font-family: 'Arial', sans-serif;
        }

        .page {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 0.5cm;
            page-break-after: always;
        }

        .page:last-child {
            page-break-after: auto;
        }

        .etiqueta {
            width: 9cm;
            height: 9cm;
            border: 2px solid #cbd5e1;
            border-radius: 0.5cm;
            padding: 0.6cm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: white;
            page-break-inside: avoid;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 0.2cm;
            margin-bottom: 0.3cm;
        }

        .header h1 {
            font-size: 12pt;
            color: #1e40af;
            font-weight: bold;
        }

        .header p {
            font-size: 7pt;
            color: #64748b;
            margin-top: 0.1cm;
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
            width: 3.5cm;
            height: 3.5cm;
            border: 1px solid #e2e8f0;
            border-radius: 0.2cm;
            padding: 0.15cm;
        }

        .scan-text {
            font-size: 7pt;
            color: #64748b;
            margin-top: 0.15cm;
            font-weight: 600;
        }

        .info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.2cm;
            padding: 0.3cm;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.1cm;
            font-size: 8pt;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-label {
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 6pt;
            letter-spacing: 0.3px;
        }

        .info-value {
            color: #1e293b;
            font-weight: bold;
            text-align: right;
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .codigo-grande {
            font-size: 9pt;
            font-family: 'Courier New', monospace;
            color: #1e40af;
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
    @php
        $chunks = $equipos->chunk(4); // 4 etiquetas por página (2x2)
    @endphp

    @foreach($chunks as $chunk)
    <div class="page">
        @foreach($chunk as $item)
        <div class="etiqueta">
            <div class="header">
                <h1>SST ROKA</h1>
                <p>Escanea para inspeccionar</p>
            </div>

            <div class="qr-container">
                <img src="{{ $item['qrImageUrl'] }}" alt="QR {{ $item['equipo']->codigo }}">
            </div>

            <div class="info">
                <div class="info-row">
                    <span class="info-label">Código</span>
                    <span class="info-value codigo-grande">{{ $item['equipo']->codigo }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Equipo</span>
                    <span class="info-value" title="{{ $item['equipo']->nombre }}">
                        {{ Str::limit($item['equipo']->nombre, 25) }}
                    </span>
                </div>
                @if($item['equipo']->area)
                <div class="info-row">
                    <span class="info-label">Área</span>
                    <span class="info-value">{{ Str::limit($item['equipo']->area->nombre, 20) }}</span>
                </div>
                @endif
                @if($item['equipo']->catalogo && $item['equipo']->catalogo->frecuencia_inspeccion)
                <div class="info-row">
                    <span class="info-label">Inspección</span>
                    <span class="info-value">{{ ucfirst($item['equipo']->catalogo->frecuencia_inspeccion) }}</span>
                </div>
                @endif
            </div>
        </div>
        @endforeach
    </div>
    @endforeach

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
