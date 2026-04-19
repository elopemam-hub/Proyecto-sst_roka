-- ============================================================
-- SST ROKA — EPPs v2: tablas adicionales
-- Ejecutar en phpMyAdmin sobre la base de datos sst_roka
-- ============================================================

-- Proveedores de EPP
CREATE TABLE IF NOT EXISTS epp_proveedores (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa_id  BIGINT UNSIGNED NOT NULL,
  nombre      VARCHAR(120) NOT NULL,
  ruc         VARCHAR(20),
  contacto    VARCHAR(100),
  telefono    VARCHAR(20),
  email       VARCHAR(100),
  activo      TINYINT(1) DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mantenimiento e Inspección de EPPs
CREATE TABLE IF NOT EXISTS epp_mantenimiento (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa_id      BIGINT UNSIGNED NOT NULL,
  inventario_id   BIGINT UNSIGNED NOT NULL,
  tipo            ENUM('mantenimiento','inspeccion','retiro','baja') NOT NULL,
  fecha           DATE NOT NULL,
  responsable     VARCHAR(120),
  resultado       ENUM('conforme','no_conforme','requiere_accion') DEFAULT 'conforme',
  observaciones   TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventario_id) REFERENCES epps_inventario(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Capacitaciones de Uso Correcto de EPPs
CREATE TABLE IF NOT EXISTS epp_capacitaciones (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa_id        BIGINT UNSIGNED NOT NULL,
  categoria_id      BIGINT UNSIGNED NULL,
  inventario_id     BIGINT UNSIGNED NULL,
  tema              VARCHAR(200) NOT NULL,
  instructor        VARCHAR(120),
  fecha             DATE NOT NULL,
  num_participantes SMALLINT DEFAULT 0,
  evidencia_url     VARCHAR(255),
  observaciones     TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
