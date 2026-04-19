-- ============================================================
--  SST ROKA — Script de base de datos completo
--  MySQL 5.7+ / MariaDB 10.4+
--  Ejecutar en phpMyAdmin o MySQL CLI
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Crear y seleccionar base de datos
CREATE DATABASE IF NOT EXISTS sst_roka
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sst_roka;

-- ============================================================
-- 1. EMPRESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  razon_social         VARCHAR(255)    NOT NULL,
  ruc                  VARCHAR(11)     NOT NULL,
  ciiu                 VARCHAR(10)     NULL,
  representante_legal  VARCHAR(255)    NOT NULL,
  dni_representante    VARCHAR(8)      NOT NULL,
  direccion            VARCHAR(255)    NOT NULL,
  telefono             VARCHAR(20)     NULL,
  email                VARCHAR(255)    NULL,
  logo_path            VARCHAR(255)    NULL,
  web                  VARCHAR(255)    NULL,
  activa               TINYINT(1)      NOT NULL DEFAULT 1,
  created_at           TIMESTAMP       NULL,
  updated_at           TIMESTAMP       NULL,
  deleted_at           TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY empresas_ruc_unique (ruc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. SEDES
-- ============================================================
CREATE TABLE IF NOT EXISTS sedes (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id       BIGINT UNSIGNED NOT NULL,
  nombre           VARCHAR(255)    NOT NULL,
  direccion        VARCHAR(255)    NOT NULL,
  ciudad           VARCHAR(255)    NULL,
  ubigeo           VARCHAR(6)      NULL,
  departamento     VARCHAR(255)    NULL,
  provincia        VARCHAR(255)    NULL,
  distrito         VARCHAR(255)    NULL,
  responsable_sst  VARCHAR(255)    NULL,
  activa           TINYINT(1)      NOT NULL DEFAULT 1,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  deleted_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY sedes_empresa_id_foreign (empresa_id),
  CONSTRAINT sedes_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. ÁREAS
-- ============================================================
CREATE TABLE IF NOT EXISTS areas (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sede_id     BIGINT UNSIGNED NOT NULL,
  nombre      VARCHAR(255)    NOT NULL,
  codigo      VARCHAR(20)     NULL,
  tipo        ENUM('almacen','transporte','taller','limpieza','vigilancia','distribucion','oficina','otro') NOT NULL DEFAULT 'otro',
  descripcion TEXT            NULL,
  activa      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NULL,
  updated_at  TIMESTAMP       NULL,
  deleted_at  TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY areas_sede_id_foreign (sede_id),
  CONSTRAINT areas_sede_id_foreign FOREIGN KEY (sede_id) REFERENCES sedes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. CARGOS
-- ============================================================
CREATE TABLE IF NOT EXISTS cargos (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id   BIGINT UNSIGNED NOT NULL,
  area_id      BIGINT UNSIGNED NULL,
  nombre       VARCHAR(255)    NOT NULL,
  codigo       VARCHAR(20)     NULL,
  nivel_riesgo ENUM('bajo','medio','alto','critico') NULL,
  es_critico   TINYINT(1)      NOT NULL DEFAULT 0,
  requiere_emo TINYINT(1)      NOT NULL DEFAULT 1,
  funciones    TEXT            NULL,
  descripcion  TEXT            NULL,
  created_at   TIMESTAMP       NULL,
  updated_at   TIMESTAMP       NULL,
  deleted_at   TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY cargos_empresa_id_foreign (empresa_id),
  CONSTRAINT cargos_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. PERSONAL
-- ============================================================
CREATE TABLE IF NOT EXISTS personal (
  id                           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id                   BIGINT UNSIGNED NOT NULL,
  sede_id                      BIGINT UNSIGNED NOT NULL,
  area_id                      BIGINT UNSIGNED NOT NULL,
  cargo_id                     BIGINT UNSIGNED NOT NULL,
  nombres                      VARCHAR(255)    NOT NULL,
  apellidos                    VARCHAR(255)    NOT NULL,
  dni                          VARCHAR(8)      NOT NULL,
  fecha_nacimiento             DATE            NULL,
  genero                       ENUM('M','F','O') NULL,
  telefono                     VARCHAR(20)     NULL,
  email                        VARCHAR(255)    NULL,
  direccion                    VARCHAR(255)    NULL,
  foto_path                    VARCHAR(255)    NULL,
  codigo_empleado              VARCHAR(30)     NULL,
  fecha_ingreso                DATE            NOT NULL,
  fecha_cese                   DATE            NULL,
  tipo_contrato                ENUM('planilla','tercero','practicante','locacion') NOT NULL DEFAULT 'planilla',
  estado                       ENUM('activo','inactivo','suspendido') NOT NULL DEFAULT 'activo',
  es_supervisor_sst            TINYINT(1)      NOT NULL DEFAULT 0,
  contacto_emergencia_nombre   VARCHAR(255)    NULL,
  contacto_emergencia_telefono VARCHAR(20)     NULL,
  grupo_sanguineo              VARCHAR(5)      NULL,
  created_at                   TIMESTAMP       NULL,
  updated_at                   TIMESTAMP       NULL,
  deleted_at                   TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY personal_dni_unique (dni),
  UNIQUE KEY personal_codigo_empleado_unique (codigo_empleado),
  KEY personal_empresa_estado (empresa_id, estado),
  KEY personal_area_estado (area_id, estado),
  CONSTRAINT personal_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT personal_sede_id_foreign    FOREIGN KEY (sede_id)    REFERENCES sedes (id)    ON DELETE CASCADE,
  CONSTRAINT personal_area_id_foreign    FOREIGN KEY (area_id)    REFERENCES areas (id)    ON DELETE CASCADE,
  CONSTRAINT personal_cargo_id_foreign   FOREIGN KEY (cargo_id)   REFERENCES cargos (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  personal_id       BIGINT UNSIGNED NULL,
  empresa_id        BIGINT UNSIGNED NOT NULL,
  nombres           VARCHAR(255)    NOT NULL,
  apellidos         VARCHAR(255)    NOT NULL DEFAULT '',
  nombre            VARCHAR(255)    NOT NULL DEFAULT '',
  email             VARCHAR(255)    NOT NULL,
  password          VARCHAR(255)    NOT NULL,
  rol               ENUM('administrador','supervisor_sst','tecnico_sst','operativo','vigilante','solo_lectura') NOT NULL DEFAULT 'operativo',
  permisos          JSON            NULL,
  activo            TINYINT(1)      NOT NULL DEFAULT 1,
  area_id           BIGINT UNSIGNED NULL,
  dos_factores      TINYINT(1)      NOT NULL DEFAULT 0,
  dos_factores_secret VARCHAR(255)  NULL,
  remember_token    VARCHAR(100)    NULL,
  ultimo_acceso     TIMESTAMP       NULL,
  ultimo_ip         VARCHAR(45)     NULL,
  intentos_fallidos INT             NOT NULL DEFAULT 0,
  bloqueado_hasta   TIMESTAMP       NULL,
  created_at        TIMESTAMP       NULL,
  updated_at        TIMESTAMP       NULL,
  deleted_at        TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY usuarios_email_unique (email),
  KEY usuarios_empresa_rol_activo (empresa_id, rol, activo),
  CONSTRAINT usuarios_personal_id_foreign FOREIGN KEY (personal_id) REFERENCES personal (id) ON DELETE SET NULL,
  CONSTRAINT usuarios_empresa_id_foreign  FOREIGN KEY (empresa_id)  REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. TOKENS SANCTUM
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tokenable_type VARCHAR(255)    NOT NULL,
  tokenable_id   BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(255)    NOT NULL,
  token          VARCHAR(64)     NOT NULL,
  abilities      TEXT            NULL,
  last_used_at   TIMESTAMP       NULL,
  expires_at     TIMESTAMP       NULL,
  created_at     TIMESTAMP       NULL,
  updated_at     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY personal_access_tokens_token_unique (token),
  KEY personal_access_tokens_tokenable (tokenable_type, tokenable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. EPPs CATEGORÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS epps_categorias (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id       BIGINT UNSIGNED NOT NULL,
  nombre           VARCHAR(100)    NOT NULL,
  descripcion      TEXT            NULL,
  requiere_talla   TINYINT(1)      NOT NULL DEFAULT 0,
  vida_util_meses  INT             NULL,
  activa           TINYINT(1)      NOT NULL DEFAULT 1,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY epps_categorias_empresa_activa (empresa_id, activa),
  CONSTRAINT epps_categorias_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. EPPs TIPOS (referencia para IPERC)
-- ============================================================
CREATE TABLE IF NOT EXISTS epps_tipos (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id     BIGINT UNSIGNED NOT NULL,
  nombre         VARCHAR(255)    NOT NULL,
  codigo         VARCHAR(20)     NULL,
  categoria      ENUM('cabeza','ojos','cara','oidos','respiracion','manos','pies','cuerpo','caidas','otro') NOT NULL DEFAULT 'otro',
  vida_util_meses INT            NOT NULL DEFAULT 12,
  norma_tecnica  VARCHAR(255)    NULL,
  descripcion    TEXT            NULL,
  created_at     TIMESTAMP       NULL,
  updated_at     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  CONSTRAINT epps_tipos_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. EPPs INVENTARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS epps_inventario (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id       BIGINT UNSIGNED NOT NULL,
  categoria_id     BIGINT UNSIGNED NOT NULL,
  nombre           VARCHAR(150)    NOT NULL,
  marca            VARCHAR(100)    NULL,
  modelo           VARCHAR(100)    NULL,
  codigo_interno   VARCHAR(50)     NULL,
  talla            VARCHAR(20)     NULL,
  stock_total      INT             NOT NULL DEFAULT 0,
  stock_disponible INT             NOT NULL DEFAULT 0,
  stock_minimo     INT             NOT NULL DEFAULT 5,
  unidad           VARCHAR(20)     NOT NULL DEFAULT 'unidad',
  costo_unitario   DECIMAL(10,2)   NULL,
  proveedor        VARCHAR(150)    NULL,
  ficha_tecnica_path VARCHAR(255)  NULL,
  activo           TINYINT(1)      NOT NULL DEFAULT 1,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  deleted_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY epps_inventario_empresa_categoria_activo (empresa_id, categoria_id, activo),
  KEY epps_inventario_stock (empresa_id, stock_disponible, stock_minimo),
  CONSTRAINT epps_inventario_empresa_id_foreign   FOREIGN KEY (empresa_id)   REFERENCES empresas (id)        ON DELETE CASCADE,
  CONSTRAINT epps_inventario_categoria_id_foreign FOREIGN KEY (categoria_id) REFERENCES epps_categorias (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. EPPs ENTREGAS
-- ============================================================
CREATE TABLE IF NOT EXISTS epps_entregas (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id     BIGINT UNSIGNED NOT NULL,
  personal_id    BIGINT UNSIGNED NOT NULL,
  inventario_id  BIGINT UNSIGNED NOT NULL,
  cantidad       INT             NOT NULL DEFAULT 1,
  fecha_entrega  DATE            NOT NULL,
  fecha_devolucion DATE          NULL,
  fecha_vencimiento DATE         NULL,
  motivo_entrega ENUM('ingreso','reposicion','deterioro','talla','perdida') NOT NULL DEFAULT 'ingreso',
  estado         ENUM('entregado','devuelto','perdido') NOT NULL DEFAULT 'entregado',
  firmado_en     TIMESTAMP       NULL,
  firma_path     VARCHAR(255)    NULL,
  observaciones  TEXT            NULL,
  entregado_por  BIGINT UNSIGNED NULL,
  created_at     TIMESTAMP       NULL,
  updated_at     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY epps_entregas_empresa_personal_estado (empresa_id, personal_id, estado),
  KEY epps_entregas_empresa_inventario (empresa_id, inventario_id),
  KEY epps_entregas_vencimiento_estado (fecha_vencimiento, estado),
  CONSTRAINT epps_entregas_empresa_id_foreign    FOREIGN KEY (empresa_id)    REFERENCES empresas (id)        ON DELETE CASCADE,
  CONSTRAINT epps_entregas_personal_id_foreign   FOREIGN KEY (personal_id)   REFERENCES personal (id)        ON DELETE RESTRICT,
  CONSTRAINT epps_entregas_inventario_id_foreign FOREIGN KEY (inventario_id) REFERENCES epps_inventario (id) ON DELETE RESTRICT,
  CONSTRAINT epps_entregas_entregado_por_foreign FOREIGN KEY (entregado_por) REFERENCES usuarios (id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. VEHÍCULOS
-- ============================================================
CREATE TABLE IF NOT EXISTS vehiculos (
  id                             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id                     BIGINT UNSIGNED NOT NULL,
  sede_id                        BIGINT UNSIGNED NULL,
  area_id                        BIGINT UNSIGNED NULL,
  conductor_habitual_id          BIGINT UNSIGNED NULL,
  placa                          VARCHAR(10)     NOT NULL,
  marca                          VARCHAR(255)    NOT NULL,
  modelo                         VARCHAR(255)    NOT NULL,
  anio                           YEAR            NULL,
  color                          VARCHAR(255)    NULL,
  tipo                           ENUM('camion','camioneta','van','auto','moto','bus','montacarga','otro') NOT NULL DEFAULT 'auto',
  soat_vencimiento               DATE            NULL,
  revision_tecnica_vencimiento   DATE            NULL,
  fecha_ultima_revision          DATE            NULL,
  seguro_vencimiento             DATE            NULL,
  estado                         ENUM('activo','operativo','mantenimiento','baja') NOT NULL DEFAULT 'activo',
  observaciones                  TEXT            NULL,
  created_at                     TIMESTAMP       NULL,
  updated_at                     TIMESTAMP       NULL,
  deleted_at                     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY vehiculos_placa_unique (placa),
  CONSTRAINT vehiculos_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. EQUIPOS
-- ============================================================
CREATE TABLE IF NOT EXISTS equipos (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id                  BIGINT UNSIGNED NOT NULL,
  area_id                     BIGINT UNSIGNED NULL,
  responsable_id              BIGINT UNSIGNED NULL,
  nombre                      VARCHAR(255)    NOT NULL,
  codigo                      VARCHAR(30)     NULL,
  marca                       VARCHAR(255)    NULL,
  modelo                      VARCHAR(255)    NULL,
  serie                       VARCHAR(255)    NULL,
  tipo                        ENUM('maquinaria','herramienta','instrumento','equipo_medicion','electrico','vehiculo','otro') NOT NULL DEFAULT 'otro',
  fecha_ultimo_mantenimiento  DATE            NULL,
  fecha_proxima_calibracion   DATE            NULL,
  fecha_proxima_revision      DATE            NULL,
  certificacion_vencimiento   DATE            NULL,
  estado                      ENUM('operativo','mantenimiento','baja') NOT NULL DEFAULT 'operativo',
  observaciones               TEXT            NULL,
  created_at                  TIMESTAMP       NULL,
  updated_at                  TIMESTAMP       NULL,
  deleted_at                  TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY equipos_codigo_unique (codigo),
  CONSTRAINT equipos_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. IPERC
-- ============================================================
CREATE TABLE IF NOT EXISTS iperc (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id         BIGINT UNSIGNED NOT NULL,
  sede_id            BIGINT UNSIGNED NOT NULL,
  area_id            BIGINT UNSIGNED NOT NULL,
  codigo             VARCHAR(30)     NOT NULL,
  titulo             VARCHAR(255)    NOT NULL,
  alcance            TEXT            NULL,
  metodologia        ENUM('IPERC_CONTINUO','IPERC_LINEA_BASE','IPERC_ESPECIFICO') NOT NULL DEFAULT 'IPERC_LINEA_BASE',
  fecha_elaboracion  DATE            NOT NULL,
  fecha_vigencia     DATE            NULL,
  version            INT             NOT NULL DEFAULT 1,
  elaborado_por      BIGINT UNSIGNED NOT NULL,
  revisado_por       BIGINT UNSIGNED NULL,
  aprobado_por       BIGINT UNSIGNED NULL,
  fecha_revision     DATE            NULL,
  fecha_aprobacion   DATE            NULL,
  estado             ENUM('borrador','en_revision','aprobado','vencido','archivado') NOT NULL DEFAULT 'borrador',
  observaciones      TEXT            NULL,
  created_at         TIMESTAMP       NULL,
  updated_at         TIMESTAMP       NULL,
  deleted_at         TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY iperc_codigo_unique (codigo),
  KEY iperc_empresa_estado (empresa_id, estado),
  KEY iperc_area_vigencia (area_id, fecha_vigencia),
  CONSTRAINT iperc_empresa_id_foreign   FOREIGN KEY (empresa_id)   REFERENCES empresas (id)  ON DELETE CASCADE,
  CONSTRAINT iperc_sede_id_foreign      FOREIGN KEY (sede_id)      REFERENCES sedes (id)     ON DELETE CASCADE,
  CONSTRAINT iperc_area_id_foreign      FOREIGN KEY (area_id)      REFERENCES areas (id)     ON DELETE CASCADE,
  CONSTRAINT iperc_elaborado_por_foreign FOREIGN KEY (elaborado_por) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT iperc_revisado_por_foreign  FOREIGN KEY (revisado_por)  REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT iperc_aprobado_por_foreign  FOREIGN KEY (aprobado_por)  REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS iperc_procesos (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  iperc_id         BIGINT UNSIGNED NOT NULL,
  proceso          VARCHAR(255)    NOT NULL,
  actividad        VARCHAR(255)    NOT NULL,
  tarea            VARCHAR(255)    NULL,
  tipo_actividad   ENUM('rutinaria','no_rutinaria','emergencia') NOT NULL DEFAULT 'rutinaria',
  orden            INT             NOT NULL DEFAULT 0,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY iperc_procesos_iperc_id (iperc_id),
  CONSTRAINT iperc_procesos_iperc_id_foreign FOREIGN KEY (iperc_id) REFERENCES iperc (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS iperc_peligros (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  iperc_proceso_id         BIGINT UNSIGNED NOT NULL,
  tipo_peligro             ENUM('fisico','quimico','biologico','ergonomico','psicosocial','mecanico','electrico','locativo','fenomeno_natural','otro') NOT NULL,
  descripcion_peligro      VARCHAR(255)    NOT NULL,
  riesgo                   VARCHAR(255)    NOT NULL,
  consecuencia             TEXT            NULL,
  prob_personas_expuestas  TINYINT         NOT NULL DEFAULT 1,
  prob_procedimientos      TINYINT         NOT NULL DEFAULT 1,
  prob_capacitacion        TINYINT         NOT NULL DEFAULT 1,
  prob_exposicion          TINYINT         NOT NULL DEFAULT 1,
  indice_probabilidad      TINYINT         NOT NULL,
  indice_severidad         TINYINT         NOT NULL,
  nivel_riesgo_inicial     INT             NOT NULL,
  clasificacion_inicial    ENUM('trivial','tolerable','moderado','importante','intolerable') NOT NULL,
  ip_residual              TINYINT         NULL,
  is_residual              TINYINT         NULL,
  nivel_riesgo_residual    INT             NULL,
  clasificacion_residual   ENUM('trivial','tolerable','moderado','importante','intolerable') NULL,
  es_riesgo_significativo  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at               TIMESTAMP       NULL,
  updated_at               TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY iperc_peligros_proceso_id (iperc_proceso_id),
  KEY iperc_peligros_tipo_clasificacion (tipo_peligro, clasificacion_inicial),
  CONSTRAINT iperc_peligros_proceso_id_foreign FOREIGN KEY (iperc_proceso_id) REFERENCES iperc_procesos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS iperc_controles (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  iperc_peligro_id         BIGINT UNSIGNED NOT NULL,
  tipo_control             ENUM('eliminacion','sustitucion','ingenieria','administrativo','epp') NOT NULL,
  descripcion              TEXT            NOT NULL,
  responsable_id           BIGINT UNSIGNED NULL,
  fecha_implementacion     DATE            NULL,
  estado_implementacion    ENUM('pendiente','en_proceso','implementado','verificado') NOT NULL DEFAULT 'pendiente',
  costo_estimado           DECIMAL(10,2)   NULL,
  evidencia_path           TEXT            NULL,
  created_at               TIMESTAMP       NULL,
  updated_at               TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY iperc_controles_peligro_id (iperc_peligro_id),
  CONSTRAINT iperc_controles_peligro_id_foreign  FOREIGN KEY (iperc_peligro_id) REFERENCES iperc_peligros (id) ON DELETE CASCADE,
  CONSTRAINT iperc_controles_responsable_foreign FOREIGN KEY (responsable_id)   REFERENCES personal (id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS iperc_epps_requeridos (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  iperc_peligro_id BIGINT UNSIGNED NOT NULL,
  epp_tipo_id      BIGINT UNSIGNED NOT NULL,
  es_obligatorio   TINYINT(1)      NOT NULL DEFAULT 1,
  observacion      TEXT            NULL,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY iperc_epps_peligro_tipo (iperc_peligro_id, epp_tipo_id),
  CONSTRAINT iperc_epps_peligro_id_foreign FOREIGN KEY (iperc_peligro_id) REFERENCES iperc_peligros (id) ON DELETE CASCADE,
  CONSTRAINT iperc_epps_tipo_id_foreign    FOREIGN KEY (epp_tipo_id)      REFERENCES epps_tipos (id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. ATS
-- ============================================================
CREATE TABLE IF NOT EXISTS ats (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id             BIGINT UNSIGNED NOT NULL,
  area_id                BIGINT UNSIGNED NOT NULL,
  iperc_id               BIGINT UNSIGNED NULL,
  codigo                 VARCHAR(30)     NOT NULL,
  titulo_trabajo         VARCHAR(255)    NOT NULL,
  descripcion            TEXT            NOT NULL,
  ubicacion              VARCHAR(255)    NOT NULL,
  fecha_ejecucion        DATE            NOT NULL,
  hora_inicio            TIME            NOT NULL,
  hora_fin               TIME            NULL,
  nivel_riesgo           ENUM('bajo','medio','alto','critico') NOT NULL DEFAULT 'medio',
  requiere_permiso_especial TINYINT(1)   NOT NULL DEFAULT 0,
  supervisor_id          BIGINT UNSIGNED NOT NULL,
  elaborado_por          BIGINT UNSIGNED NOT NULL,
  estado                 ENUM('borrador','pendiente_firma','autorizado','en_ejecucion','cerrado','cancelado') NOT NULL DEFAULT 'borrador',
  autorizado_en          TIMESTAMP       NULL,
  cerrado_en             TIMESTAMP       NULL,
  cerrado_por            BIGINT UNSIGNED NULL,
  observaciones_cierre   TEXT            NULL,
  created_at             TIMESTAMP       NULL,
  updated_at             TIMESTAMP       NULL,
  deleted_at             TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ats_codigo_unique (codigo),
  KEY ats_empresa_estado_fecha (empresa_id, estado, fecha_ejecucion),
  KEY ats_area_riesgo (area_id, nivel_riesgo),
  CONSTRAINT ats_empresa_id_foreign   FOREIGN KEY (empresa_id)   REFERENCES empresas (id)  ON DELETE CASCADE,
  CONSTRAINT ats_area_id_foreign      FOREIGN KEY (area_id)      REFERENCES areas (id)     ON DELETE CASCADE,
  CONSTRAINT ats_iperc_id_foreign     FOREIGN KEY (iperc_id)     REFERENCES iperc (id)     ON DELETE SET NULL,
  CONSTRAINT ats_supervisor_foreign   FOREIGN KEY (supervisor_id) REFERENCES personal (id) ON DELETE RESTRICT,
  CONSTRAINT ats_elaborado_por_foreign FOREIGN KEY (elaborado_por) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT ats_cerrado_por_foreign  FOREIGN KEY (cerrado_por)  REFERENCES usuarios (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ats_tareas (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ats_id              BIGINT UNSIGNED NOT NULL,
  orden               INT             NOT NULL DEFAULT 0,
  descripcion_tarea   VARCHAR(255)    NOT NULL,
  peligros_asociados  TEXT            NULL,
  medidas_control     TEXT            NULL,
  estado_ejecucion    ENUM('pendiente','ejecutada','omitida') NOT NULL DEFAULT 'pendiente',
  observaciones       TEXT            NULL,
  created_at          TIMESTAMP       NULL,
  updated_at          TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY ats_tareas_ats_id (ats_id),
  CONSTRAINT ats_tareas_ats_id_foreign FOREIGN KEY (ats_id) REFERENCES ats (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ats_participantes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ats_id      BIGINT UNSIGNED NOT NULL,
  personal_id BIGINT UNSIGNED NOT NULL,
  rol         ENUM('supervisor','ejecutor','observador','ayudante') NOT NULL DEFAULT 'ejecutor',
  firmado_en  TIMESTAMP       NULL,
  created_at  TIMESTAMP       NULL,
  updated_at  TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ats_participantes_ats_personal (ats_id, personal_id),
  CONSTRAINT ats_participantes_ats_id_foreign     FOREIGN KEY (ats_id)      REFERENCES ats (id)      ON DELETE CASCADE,
  CONSTRAINT ats_participantes_personal_id_foreign FOREIGN KEY (personal_id) REFERENCES personal (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permisos_trabajo (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ats_id               BIGINT UNSIGNED NOT NULL,
  tipo_permiso         ENUM('trabajo_altura','espacios_confinados','trabajo_caliente','trabajo_electrico','izaje_cargas','excavacion','quimicos_peligrosos','radiaciones_ionizantes') NOT NULL,
  codigo_permiso       VARCHAR(30)     NOT NULL,
  fecha_validez        DATE            NOT NULL,
  hora_inicio_validez  TIME            NOT NULL,
  hora_fin_validez     TIME            NOT NULL,
  requisitos_cumplidos JSON            NULL,
  equipos_requeridos   TEXT            NULL,
  condiciones_especiales TEXT          NULL,
  estado               ENUM('solicitado','aprobado','rechazado','ejecutado','cerrado') NOT NULL DEFAULT 'solicitado',
  aprobado_por         BIGINT UNSIGNED NULL,
  aprobado_en          TIMESTAMP       NULL,
  created_at           TIMESTAMP       NULL,
  updated_at           TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY permisos_trabajo_codigo_unique (codigo_permiso),
  KEY permisos_trabajo_tipo_estado (tipo_permiso, estado),
  CONSTRAINT permisos_trabajo_ats_id_foreign       FOREIGN KEY (ats_id)       REFERENCES ats (id)       ON DELETE CASCADE,
  CONSTRAINT permisos_trabajo_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES usuarios (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. FIRMAS DIGITALES
-- ============================================================
CREATE TABLE IF NOT EXISTS firmas_flujos (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id       BIGINT UNSIGNED NOT NULL,
  nombre           VARCHAR(255)    NOT NULL,
  modulo           VARCHAR(50)     NOT NULL,
  tipo_documento   VARCHAR(100)    NULL,
  descripcion      TEXT            NULL,
  activo           TINYINT(1)      NOT NULL DEFAULT 1,
  secuencial       TINYINT(1)      NOT NULL DEFAULT 1,
  dias_limite      INT             NOT NULL DEFAULT 7,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  deleted_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY firmas_flujos_empresa_modulo_activo (empresa_id, modulo, activo),
  CONSTRAINT firmas_flujos_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS firmas_solicitudes (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id        BIGINT UNSIGNED NOT NULL,
  flujo_id          BIGINT UNSIGNED NULL,
  documento_tipo    VARCHAR(100)    NOT NULL,
  documento_id      BIGINT UNSIGNED NOT NULL,
  documento_codigo  VARCHAR(50)     NULL,
  documento_titulo  VARCHAR(255)    NOT NULL,
  hash_documento    VARCHAR(64)     NOT NULL,
  snapshot_datos    JSON            NULL,
  estado            ENUM('pendiente','en_proceso','completada','rechazada','vencida','cancelada') NOT NULL DEFAULT 'pendiente',
  solicitada_en     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_limite      TIMESTAMP       NULL,
  completada_en     TIMESTAMP       NULL,
  solicitada_por    BIGINT UNSIGNED NOT NULL,
  created_at        TIMESTAMP       NULL,
  updated_at        TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY firmas_solicitudes_empresa_estado (empresa_id, estado),
  KEY firmas_solicitudes_documento (documento_tipo, documento_id),
  KEY firmas_solicitudes_fecha_limite (fecha_limite),
  CONSTRAINT firmas_solicitudes_empresa_id_foreign    FOREIGN KEY (empresa_id)    REFERENCES empresas (id)       ON DELETE CASCADE,
  CONSTRAINT firmas_solicitudes_flujo_id_foreign      FOREIGN KEY (flujo_id)      REFERENCES firmas_flujos (id)  ON DELETE SET NULL,
  CONSTRAINT firmas_solicitudes_solicitada_por_foreign FOREIGN KEY (solicitada_por) REFERENCES usuarios (id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS firmas (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  solicitud_id          BIGINT UNSIGNED NULL,
  usuario_id            BIGINT UNSIGNED NOT NULL,
  documento_tipo        VARCHAR(100)    NOT NULL,
  documento_id          BIGINT UNSIGNED NOT NULL,
  firmante_nombre       VARCHAR(255)    NOT NULL,
  firmante_dni          VARCHAR(8)      NULL,
  firmante_cargo        VARCHAR(255)    NULL,
  firmante_rol          VARCHAR(50)     NOT NULL,
  accion_firma          ENUM('elabora','revisa','aprueba','recibe','ejecuta','acepta') NOT NULL,
  metodo_firma          ENUM('canvas','pin','totp','biometrico') NOT NULL DEFAULT 'canvas',
  firma_imagen_path     TEXT            NULL,
  firma_imagen_hash     VARCHAR(64)     NULL,
  hash_documento_firmado VARCHAR(64)    NOT NULL,
  hash_firma            VARCHAR(64)     NOT NULL,
  ip                    VARCHAR(45)     NOT NULL,
  user_agent            VARCHAR(500)    NULL,
  geolocalizacion       JSON            NULL,
  dispositivo           VARCHAR(100)    NULL,
  firmado_en            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sello_tiempo          VARCHAR(255)    NULL,
  verificado_2fa        TINYINT(1)      NOT NULL DEFAULT 0,
  token_2fa_usado       VARCHAR(10)     NULL,
  observaciones         TEXT            NULL,
  rechazada             TINYINT(1)      NOT NULL DEFAULT 0,
  motivo_rechazo        TEXT            NULL,
  created_at            TIMESTAMP       NULL,
  updated_at            TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY firmas_hash_firma_unique (hash_firma),
  KEY firmas_documento (documento_tipo, documento_id),
  KEY firmas_usuario_fecha (usuario_id, firmado_en),
  CONSTRAINT firmas_solicitud_id_foreign FOREIGN KEY (solicitud_id) REFERENCES firmas_solicitudes (id) ON DELETE CASCADE,
  CONSTRAINT firmas_usuario_id_foreign   FOREIGN KEY (usuario_id)   REFERENCES usuarios (id)           ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. INSPECCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS inspecciones (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id               BIGINT UNSIGNED NOT NULL,
  sede_id                  BIGINT UNSIGNED NOT NULL,
  area_id                  BIGINT UNSIGNED NOT NULL,
  codigo                   VARCHAR(30)     NOT NULL,
  tipo                     ENUM('equipos','infraestructura','emergencias','epps','orden_limpieza','higiene','general') NOT NULL DEFAULT 'general',
  titulo                   VARCHAR(255)    NOT NULL,
  descripcion              TEXT            NULL,
  planificada_para         DATE            NULL,
  ejecutada_en             DATETIME        NULL,
  inspector_id             BIGINT UNSIGNED NOT NULL,
  supervisor_id            BIGINT UNSIGNED NULL,
  elaborado_por            BIGINT UNSIGNED NOT NULL,
  estado                   ENUM('programada','en_ejecucion','ejecutada','con_hallazgos','cerrada','anulada') NOT NULL DEFAULT 'programada',
  puntaje_total            DECIMAL(6,2)    NOT NULL DEFAULT 0,
  puntaje_obtenido         DECIMAL(6,2)    NOT NULL DEFAULT 0,
  porcentaje_cumplimiento  DECIMAL(5,2)    NOT NULL DEFAULT 0,
  observaciones_generales  TEXT            NULL,
  requiere_firma           TINYINT(1)      NOT NULL DEFAULT 0,
  created_at               TIMESTAMP       NULL,
  updated_at               TIMESTAMP       NULL,
  deleted_at               TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY inspecciones_codigo_unique (codigo),
  KEY inspecciones_empresa_estado_tipo (empresa_id, estado, tipo),
  KEY inspecciones_area_fecha (area_id, planificada_para),
  CONSTRAINT inspecciones_empresa_id_foreign   FOREIGN KEY (empresa_id)   REFERENCES empresas (id)  ON DELETE CASCADE,
  CONSTRAINT inspecciones_sede_id_foreign      FOREIGN KEY (sede_id)      REFERENCES sedes (id)     ON DELETE CASCADE,
  CONSTRAINT inspecciones_area_id_foreign      FOREIGN KEY (area_id)      REFERENCES areas (id)     ON DELETE CASCADE,
  CONSTRAINT inspecciones_inspector_foreign    FOREIGN KEY (inspector_id) REFERENCES personal (id)  ON DELETE RESTRICT,
  CONSTRAINT inspecciones_supervisor_foreign   FOREIGN KEY (supervisor_id) REFERENCES personal (id) ON DELETE SET NULL,
  CONSTRAINT inspecciones_elaborado_por_foreign FOREIGN KEY (elaborado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inspecciones_hallazgos (
  id                        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspeccion_id             BIGINT UNSIGNED NOT NULL,
  numero_hallazgo           VARCHAR(20)     NULL,
  descripcion               TEXT            NOT NULL,
  tipo                      ENUM('no_conformidad','observacion','oportunidad_mejora') NOT NULL DEFAULT 'no_conformidad',
  criticidad                ENUM('leve','moderado','critico') NOT NULL DEFAULT 'moderado',
  area_id                   BIGINT UNSIGNED NULL,
  responsable_id            BIGINT UNSIGNED NULL,
  fecha_limite_correccion   DATE            NULL,
  estado                    ENUM('pendiente','en_proceso','subsanado','verificado','vencido') NOT NULL DEFAULT 'pendiente',
  evidencia_antes_path      TEXT            NULL,
  evidencia_despues_path    TEXT            NULL,
  observaciones             TEXT            NULL,
  accion_seguimiento_id     BIGINT UNSIGNED NULL,
  created_at                TIMESTAMP       NULL,
  updated_at                TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY inspecciones_hallazgos_inspeccion_criticidad_estado (inspeccion_id, criticidad, estado),
  CONSTRAINT inspeccion_hallazgos_inspeccion_foreign   FOREIGN KEY (inspeccion_id) REFERENCES inspecciones (id) ON DELETE CASCADE,
  CONSTRAINT inspeccion_hallazgos_area_id_foreign      FOREIGN KEY (area_id)       REFERENCES areas (id)        ON DELETE SET NULL,
  CONSTRAINT inspeccion_hallazgos_responsable_foreign  FOREIGN KEY (responsable_id) REFERENCES personal (id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. ACCIDENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS accidentes (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id                  BIGINT UNSIGNED NOT NULL,
  sede_id                     BIGINT UNSIGNED NOT NULL,
  area_id                     BIGINT UNSIGNED NOT NULL,
  codigo                      VARCHAR(30)     NOT NULL,
  tipo                        ENUM('accidente_leve','accidente_incapacitante','accidente_mortal','incidente_peligroso','incidente') NOT NULL,
  fecha_accidente             DATETIME        NOT NULL,
  lugar_exacto                VARCHAR(255)    NOT NULL,
  descripcion_evento          TEXT            NOT NULL,
  accidentado_id              BIGINT UNSIGNED NOT NULL,
  testigos                    JSON            NULL,
  dias_perdidos               INT             NOT NULL DEFAULT 0,
  parte_cuerpo_afectada       VARCHAR(150)    NULL,
  tipo_lesion                 VARCHAR(150)    NULL,
  agente_causante             VARCHAR(255)    NULL,
  descripcion_lesion          TEXT            NULL,
  requiere_hospitalizacion    TINYINT(1)      NOT NULL DEFAULT 0,
  centro_medico               VARCHAR(255)    NULL,
  descripcion_atencion        TEXT            NULL,
  estado                      ENUM('registrado','en_investigacion','investigado','notificado_mintra','cerrado') NOT NULL DEFAULT 'registrado',
  notificado_mintra           TINYINT(1)      NOT NULL DEFAULT 0,
  fecha_notificacion_mintra   DATE            NULL,
  numero_notificacion_mintra  VARCHAR(50)     NULL,
  elaborado_por               BIGINT UNSIGNED NOT NULL,
  costo_atencion              DECIMAL(10,2)   NULL,
  costo_dias_perdidos         DECIMAL(10,2)   NULL,
  costo_danos_materiales      DECIMAL(10,2)   NULL,
  costo_total                 DECIMAL(10,2)   NULL,
  created_at                  TIMESTAMP       NULL,
  updated_at                  TIMESTAMP       NULL,
  deleted_at                  TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY accidentes_codigo_unique (codigo),
  KEY accidentes_empresa_tipo_estado (empresa_id, tipo, estado),
  KEY accidentes_empresa_fecha (empresa_id, fecha_accidente),
  KEY accidentes_accidentado (accidentado_id),
  CONSTRAINT accidentes_empresa_id_foreign      FOREIGN KEY (empresa_id)    REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT accidentes_sede_id_foreign         FOREIGN KEY (sede_id)       REFERENCES sedes (id)    ON DELETE CASCADE,
  CONSTRAINT accidentes_area_id_foreign         FOREIGN KEY (area_id)       REFERENCES areas (id)    ON DELETE CASCADE,
  CONSTRAINT accidentes_accidentado_id_foreign  FOREIGN KEY (accidentado_id) REFERENCES personal (id) ON DELETE RESTRICT,
  CONSTRAINT accidentes_elaborado_por_foreign   FOREIGN KEY (elaborado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accidentes_investigacion (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  accidente_id                BIGINT UNSIGNED NOT NULL,
  metodologia                 ENUM('arbol_causas','cinco_porques','ishikawa','combinado') NOT NULL DEFAULT 'cinco_porques',
  causas_inmediatas           JSON            NULL,
  causas_basicas              JSON            NULL,
  factores_trabajo            TEXT            NULL,
  factores_personales         TEXT            NULL,
  descripcion_metodologia     TEXT            NULL,
  lecciones_aprendidas        TEXT            NULL,
  investigador_id             BIGINT UNSIGNED NOT NULL,
  fecha_inicio_investigacion  DATE            NOT NULL,
  fecha_cierre_investigacion  DATE            NULL,
  created_at                  TIMESTAMP       NULL,
  updated_at                  TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY accidentes_investigacion_accidente_unique (accidente_id),
  CONSTRAINT acc_investigacion_accidente_foreign   FOREIGN KEY (accidente_id)   REFERENCES accidentes (id) ON DELETE CASCADE,
  CONSTRAINT acc_investigacion_investigador_foreign FOREIGN KEY (investigador_id) REFERENCES usuarios (id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accidentes_acciones (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  accidente_id   BIGINT UNSIGNED NOT NULL,
  tipo           ENUM('correctiva','preventiva','mejora') NOT NULL DEFAULT 'correctiva',
  descripcion    TEXT            NOT NULL,
  responsable_id BIGINT UNSIGNED NOT NULL,
  fecha_limite   DATE            NOT NULL,
  estado         ENUM('pendiente','en_proceso','completada','vencida') NOT NULL DEFAULT 'pendiente',
  evidencia_path TEXT            NULL,
  observaciones  TEXT            NULL,
  completada_en  DATETIME        NULL,
  verificado_por BIGINT UNSIGNED NULL,
  created_at     TIMESTAMP       NULL,
  updated_at     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY accidentes_acciones_accidente_estado (accidente_id, estado),
  CONSTRAINT acc_acciones_accidente_id_foreign  FOREIGN KEY (accidente_id)   REFERENCES accidentes (id) ON DELETE CASCADE,
  CONSTRAINT acc_acciones_responsable_foreign   FOREIGN KEY (responsable_id) REFERENCES personal (id)   ON DELETE RESTRICT,
  CONSTRAINT acc_acciones_verificado_por_foreign FOREIGN KEY (verificado_por) REFERENCES usuarios (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. SEGUIMIENTO DE ACCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS acciones_seguimiento (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id               BIGINT UNSIGNED NOT NULL,
  origen_tipo              ENUM('inspeccion','accidente','auditoria','iperc','ats','otro') NOT NULL DEFAULT 'otro',
  origen_id                BIGINT UNSIGNED NULL,
  codigo                   VARCHAR(30)     NOT NULL,
  tipo                     ENUM('correctiva','preventiva','mejora','legal') NOT NULL DEFAULT 'correctiva',
  titulo                   VARCHAR(255)    NOT NULL,
  descripcion              TEXT            NOT NULL,
  responsable_id           BIGINT UNSIGNED NOT NULL,
  area_id                  BIGINT UNSIGNED NOT NULL,
  prioridad                ENUM('baja','media','alta','critica') NOT NULL DEFAULT 'media',
  fecha_programada         DATE            NOT NULL,
  fecha_limite             DATE            NOT NULL,
  fecha_ejecucion          DATE            NULL,
  porcentaje_avance        TINYINT         NOT NULL DEFAULT 0,
  estado                   ENUM('pendiente','en_proceso','completada','vencida','validada','cancelada') NOT NULL DEFAULT 'pendiente',
  evidencias               JSON            NULL,
  observaciones            TEXT            NULL,
  validado_por             BIGINT UNSIGNED NULL,
  validado_en              DATETIME        NULL,
  observaciones_validacion TEXT            NULL,
  created_at               TIMESTAMP       NULL,
  updated_at               TIMESTAMP       NULL,
  deleted_at               TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY acciones_seguimiento_codigo_unique (codigo),
  KEY acciones_empresa_estado_prioridad (empresa_id, estado, prioridad),
  KEY acciones_empresa_fecha_limite (empresa_id, fecha_limite),
  KEY acciones_origen (origen_tipo, origen_id),
  KEY acciones_responsable (responsable_id),
  CONSTRAINT acciones_empresa_id_foreign    FOREIGN KEY (empresa_id)    REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT acciones_responsable_foreign   FOREIGN KEY (responsable_id) REFERENCES personal (id) ON DELETE RESTRICT,
  CONSTRAINT acciones_area_id_foreign       FOREIGN KEY (area_id)        REFERENCES areas (id)    ON DELETE RESTRICT,
  CONSTRAINT acciones_validado_por_foreign  FOREIGN KEY (validado_por)   REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 20. SALUD OCUPACIONAL
-- ============================================================
CREATE TABLE IF NOT EXISTS salud_emo (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id       BIGINT UNSIGNED NOT NULL,
  personal_id      BIGINT UNSIGNED NOT NULL,
  tipo             ENUM('pre_ocupacional','periodico','retiro','por_cambio_ocupacional') NOT NULL,
  fecha_examen     DATE            NOT NULL,
  fecha_vencimiento DATE           NULL,
  clinica          VARCHAR(150)    NULL,
  medico           VARCHAR(150)    NULL,
  resultado        ENUM('apto','apto_con_restricciones','no_apto') NOT NULL DEFAULT 'apto',
  restricciones    TEXT            NULL,
  observaciones    TEXT            NULL,
  archivo_path     VARCHAR(255)    NULL,
  notificado       TINYINT(1)      NOT NULL DEFAULT 0,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY salud_emo_empresa_personal (empresa_id, personal_id),
  KEY salud_emo_empresa_resultado (empresa_id, resultado),
  KEY salud_emo_empresa_vencimiento (empresa_id, fecha_vencimiento),
  CONSTRAINT salud_emo_empresa_id_foreign  FOREIGN KEY (empresa_id)  REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT salud_emo_personal_id_foreign FOREIGN KEY (personal_id) REFERENCES personal (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salud_restricciones (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id       BIGINT UNSIGNED NOT NULL,
  personal_id      BIGINT UNSIGNED NOT NULL,
  emo_id           BIGINT UNSIGNED NULL,
  area_id          BIGINT UNSIGNED NULL,
  descripcion      TEXT            NOT NULL,
  tipo_restriccion VARCHAR(100)    NOT NULL,
  fecha_inicio     DATE            NOT NULL,
  fecha_fin        DATE            NULL,
  activa           TINYINT(1)      NOT NULL DEFAULT 1,
  observaciones    TEXT            NULL,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY salud_restricciones_empresa_personal_activa (empresa_id, personal_id, activa),
  CONSTRAINT salud_restricciones_empresa_id_foreign  FOREIGN KEY (empresa_id)  REFERENCES empresas (id)  ON DELETE CASCADE,
  CONSTRAINT salud_restricciones_personal_id_foreign FOREIGN KEY (personal_id) REFERENCES personal (id)  ON DELETE RESTRICT,
  CONSTRAINT salud_restricciones_emo_id_foreign      FOREIGN KEY (emo_id)      REFERENCES salud_emo (id) ON DELETE SET NULL,
  CONSTRAINT salud_restricciones_area_id_foreign     FOREIGN KEY (area_id)     REFERENCES areas (id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salud_atenciones (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id     BIGINT UNSIGNED NOT NULL,
  personal_id    BIGINT UNSIGNED NOT NULL,
  fecha          DATETIME        NOT NULL,
  tipo           ENUM('primeros_auxilios','consulta','emergencia','seguimiento') NOT NULL,
  descripcion    TEXT            NOT NULL,
  tratamiento    TEXT            NULL,
  derivado_a     VARCHAR(150)    NULL,
  baja_laboral   TINYINT(1)      NOT NULL DEFAULT 0,
  dias_descanso  INT             NOT NULL DEFAULT 0,
  observaciones  TEXT            NULL,
  atendido_por   VARCHAR(100)    NULL,
  created_at     TIMESTAMP       NULL,
  updated_at     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY salud_atenciones_empresa_personal (empresa_id, personal_id),
  KEY salud_atenciones_empresa_fecha (empresa_id, fecha),
  CONSTRAINT salud_atenciones_empresa_id_foreign  FOREIGN KEY (empresa_id)  REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT salud_atenciones_personal_id_foreign FOREIGN KEY (personal_id) REFERENCES personal (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21. CAPACITACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS capacitaciones (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id         BIGINT UNSIGNED NOT NULL,
  area_id            BIGINT UNSIGNED NULL,
  titulo             VARCHAR(200)    NOT NULL,
  tema               VARCHAR(300)    NULL,
  tipo               ENUM('induccion','especifica','general','sensibilizacion') NOT NULL DEFAULT 'general',
  modalidad          ENUM('presencial','virtual','mixto') NOT NULL DEFAULT 'presencial',
  fecha_programada   DATE            NOT NULL,
  fecha_ejecutada    DATE            NULL,
  duracion_horas     DECIMAL(5,2)    NOT NULL DEFAULT 1,
  expositor          VARCHAR(150)    NULL,
  expositor_cargo    VARCHAR(100)    NULL,
  lugar              VARCHAR(200)    NULL,
  max_participantes  INT UNSIGNED    NULL,
  estado             ENUM('programada','ejecutada','cancelada','reprogramada') NOT NULL DEFAULT 'programada',
  observaciones      TEXT            NULL,
  archivo_material   VARCHAR(255)    NULL,
  created_at         TIMESTAMP       NULL,
  updated_at         TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY capacitaciones_empresa_estado (empresa_id, estado),
  KEY capacitaciones_empresa_fecha (empresa_id, fecha_programada),
  CONSTRAINT capacitaciones_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT capacitaciones_area_id_foreign    FOREIGN KEY (area_id)    REFERENCES areas (id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS capacitacion_asistentes (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  capacitacion_id  BIGINT UNSIGNED NOT NULL,
  personal_id      BIGINT UNSIGNED NOT NULL,
  asistio          TINYINT(1)      NOT NULL DEFAULT 0,
  hora_ingreso     TIME            NULL,
  hora_salida      TIME            NULL,
  nota_evaluacion  DECIMAL(5,2)    NULL,
  aprobado         TINYINT(1)      NULL,
  firma_path       VARCHAR(255)    NULL,
  observaciones    TEXT            NULL,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY capacitacion_asistentes_cap_personal (capacitacion_id, personal_id),
  CONSTRAINT cap_asistentes_capacitacion_foreign FOREIGN KEY (capacitacion_id) REFERENCES capacitaciones (id) ON DELETE CASCADE,
  CONSTRAINT cap_asistentes_personal_foreign     FOREIGN KEY (personal_id)     REFERENCES personal (id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 22. SIMULACROS
-- ============================================================
CREATE TABLE IF NOT EXISTS simulacros (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id           BIGINT UNSIGNED NOT NULL,
  area_id              BIGINT UNSIGNED NULL,
  coordinador_id       BIGINT UNSIGNED NULL,
  tipo                 ENUM('sismo','incendio','derrame','evacuacion','primeros_auxilios','otro') NOT NULL,
  nombre               VARCHAR(200)    NOT NULL,
  descripcion          TEXT            NULL,
  fecha_programada     DATE            NOT NULL,
  fecha_ejecutada      DATE            NULL,
  hora_inicio          TIME            NULL,
  hora_fin             TIME            NULL,
  lugar                VARCHAR(200)    NULL,
  estado               ENUM('programado','ejecutado','cancelado') NOT NULL DEFAULT 'programado',
  tiempo_respuesta_min INT UNSIGNED    NULL,
  personas_evacuadas   INT UNSIGNED    NULL,
  observaciones        TEXT            NULL,
  lecciones_aprendidas TEXT            NULL,
  archivo_informe      VARCHAR(255)    NULL,
  created_at           TIMESTAMP       NULL,
  updated_at           TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY simulacros_empresa_estado (empresa_id, estado),
  KEY simulacros_empresa_fecha (empresa_id, fecha_programada),
  CONSTRAINT simulacros_empresa_id_foreign      FOREIGN KEY (empresa_id)     REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT simulacros_area_id_foreign         FOREIGN KEY (area_id)        REFERENCES areas (id)    ON DELETE SET NULL,
  CONSTRAINT simulacros_coordinador_id_foreign  FOREIGN KEY (coordinador_id) REFERENCES personal (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS simulacro_participantes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  simulacro_id  BIGINT UNSIGNED NOT NULL,
  personal_id   BIGINT UNSIGNED NOT NULL,
  rol           ENUM('participante','observador','brigadista','coordinador') NOT NULL DEFAULT 'participante',
  asistio       TINYINT(1)      NOT NULL DEFAULT 0,
  observaciones TEXT            NULL,
  created_at    TIMESTAMP       NULL,
  updated_at    TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY simulacro_participantes_sim_personal (simulacro_id, personal_id),
  CONSTRAINT sim_participantes_simulacro_foreign FOREIGN KEY (simulacro_id) REFERENCES simulacros (id) ON DELETE CASCADE,
  CONSTRAINT sim_participantes_personal_foreign  FOREIGN KEY (personal_id)  REFERENCES personal (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS simulacro_evaluacion (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  simulacro_id   BIGINT UNSIGNED NOT NULL,
  criterio       VARCHAR(200)    NOT NULL,
  calificacion   TINYINT UNSIGNED NOT NULL DEFAULT 3,
  observacion    TEXT            NULL,
  evaluado_por   VARCHAR(150)    NULL,
  created_at     TIMESTAMP       NULL,
  updated_at     TIMESTAMP       NULL,
  PRIMARY KEY (id),
  CONSTRAINT sim_evaluacion_simulacro_foreign FOREIGN KEY (simulacro_id) REFERENCES simulacros (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 23. AUDITORÍAS INTERNAS
-- ============================================================
CREATE TABLE IF NOT EXISTS auditorias (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id        BIGINT UNSIGNED NOT NULL,
  area_id           BIGINT UNSIGNED NULL,
  tipo              ENUM('interna','externa') NOT NULL DEFAULT 'interna',
  norma_referencia  VARCHAR(150)    NULL,
  auditor_lider     VARCHAR(150)    NOT NULL,
  equipo_auditor    JSON            NULL,
  fecha_programada  DATE            NOT NULL,
  fecha_ejecutada   DATE            NULL,
  alcance           TEXT            NULL,
  objetivo          TEXT            NULL,
  estado            ENUM('programada','en_proceso','completada','cancelada') NOT NULL DEFAULT 'programada',
  conclusion        TEXT            NULL,
  archivo_informe   VARCHAR(255)    NULL,
  created_at        TIMESTAMP       NULL,
  updated_at        TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY auditorias_empresa_estado (empresa_id, estado),
  KEY auditorias_empresa_fecha (empresa_id, fecha_programada),
  CONSTRAINT auditorias_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT auditorias_area_id_foreign    FOREIGN KEY (area_id)    REFERENCES areas (id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria_hallazgos (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id        BIGINT UNSIGNED NOT NULL,
  auditoria_id      BIGINT UNSIGNED NOT NULL,
  responsable_id    BIGINT UNSIGNED NULL,
  tipo_hallazgo     ENUM('no_conformidad_mayor','no_conformidad_menor','observacion','oportunidad_mejora') NOT NULL,
  clausula_norma    VARCHAR(100)    NULL,
  descripcion       TEXT            NOT NULL,
  evidencia         TEXT            NULL,
  accion_correctiva TEXT            NULL,
  fecha_limite      DATE            NULL,
  fecha_cierre      DATE            NULL,
  estado            ENUM('abierto','en_proceso','cerrado','vencido') NOT NULL DEFAULT 'abierto',
  created_at        TIMESTAMP       NULL,
  updated_at        TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY auditoria_hallazgos_empresa_estado (empresa_id, estado),
  KEY auditoria_hallazgos_auditoria_tipo (auditoria_id, tipo_hallazgo),
  CONSTRAINT auditoria_hallazgos_empresa_id_foreign    FOREIGN KEY (empresa_id)    REFERENCES empresas (id)   ON DELETE CASCADE,
  CONSTRAINT auditoria_hallazgos_auditoria_id_foreign  FOREIGN KEY (auditoria_id)  REFERENCES auditorias (id) ON DELETE CASCADE,
  CONSTRAINT auditoria_hallazgos_responsable_foreign   FOREIGN KEY (responsable_id) REFERENCES personal (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria_seguimiento (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hallazgo_id     BIGINT UNSIGNED NOT NULL,
  fecha           DATE            NOT NULL,
  descripcion     TEXT            NOT NULL,
  evidencia_cierre TEXT           NULL,
  verificado_por  VARCHAR(150)    NULL,
  resultado       ENUM('conforme','no_conforme','parcial') NULL,
  created_at      TIMESTAMP       NULL,
  updated_at      TIMESTAMP       NULL,
  PRIMARY KEY (id),
  CONSTRAINT auditoria_seguimiento_hallazgo_foreign FOREIGN KEY (hallazgo_id) REFERENCES auditoria_hallazgos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 24. FORMATOS RM 050-2013-TR
-- ============================================================
CREATE TABLE IF NOT EXISTS formatos_registros (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id      BIGINT UNSIGNED NOT NULL,
  tipo_registro   ENUM('reg_01','reg_02','reg_03','reg_04','reg_05','reg_06','reg_07','reg_08','reg_09','reg_10') NOT NULL,
  correlativo     VARCHAR(30)     NOT NULL,
  titulo          VARCHAR(250)    NOT NULL,
  periodo_anio    SMALLINT UNSIGNED NOT NULL,
  periodo_mes     TINYINT UNSIGNED NULL,
  estado          ENUM('borrador','vigente','anulado') NOT NULL DEFAULT 'borrador',
  datos_json      JSON            NULL,
  origen_tipo     VARCHAR(50)     NULL,
  origen_id       BIGINT UNSIGNED NULL,
  creado_por      BIGINT UNSIGNED NOT NULL,
  observaciones   TEXT            NULL,
  created_at      TIMESTAMP       NULL,
  updated_at      TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY formatos_correlativo_unique (correlativo),
  KEY formatos_empresa_tipo (empresa_id, tipo_registro),
  KEY formatos_empresa_estado (empresa_id, estado),
  KEY formatos_empresa_anio (empresa_id, periodo_anio),
  CONSTRAINT formatos_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT formatos_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 25. DOCUMENTOS SST
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id       BIGINT UNSIGNED NOT NULL,
  area_id          BIGINT UNSIGNED NULL,
  codigo           VARCHAR(30)     NOT NULL,
  titulo           VARCHAR(200)    NOT NULL,
  descripcion      TEXT            NULL,
  tipo             ENUM('politica','procedimiento','instructivo','registro','plan','programa','otro') NOT NULL DEFAULT 'procedimiento',
  version_actual   VARCHAR(10)     NOT NULL DEFAULT '1.0',
  estado           ENUM('borrador','en_revision','aprobado','obsoleto') NOT NULL DEFAULT 'borrador',
  archivo_path     VARCHAR(255)    NULL,
  archivo_nombre   VARCHAR(255)    NULL,
  creado_por       BIGINT UNSIGNED NOT NULL,
  aprobado_por     BIGINT UNSIGNED NULL,
  fecha_aprobacion DATE            NULL,
  fecha_revision   DATE            NULL,
  observaciones    TEXT            NULL,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY documentos_codigo_unique (codigo),
  KEY documentos_empresa_tipo (empresa_id, tipo),
  KEY documentos_empresa_estado (empresa_id, estado),
  CONSTRAINT documentos_empresa_id_foreign  FOREIGN KEY (empresa_id)  REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT documentos_area_id_foreign     FOREIGN KEY (area_id)     REFERENCES areas (id)    ON DELETE SET NULL,
  CONSTRAINT documentos_creado_por_foreign  FOREIGN KEY (creado_por)  REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT documentos_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documentos_versiones (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  documento_id BIGINT UNSIGNED NOT NULL,
  version      VARCHAR(10)     NOT NULL,
  archivo_path VARCHAR(255)    NULL,
  cambios      TEXT            NULL,
  creado_por   BIGINT UNSIGNED NOT NULL,
  created_at   TIMESTAMP       NULL,
  updated_at   TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY documentos_versiones_documento_id (documento_id),
  CONSTRAINT documentos_versiones_documento_foreign  FOREIGN KEY (documento_id) REFERENCES documentos (id) ON DELETE CASCADE,
  CONSTRAINT documentos_versiones_creado_por_foreign FOREIGN KEY (creado_por)   REFERENCES usuarios (id)   ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 26. NOTIFICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id    BIGINT UNSIGNED NOT NULL,
  titulo        VARCHAR(255)    NOT NULL,
  mensaje       TEXT            NOT NULL,
  tipo          VARCHAR(50)     NOT NULL DEFAULT 'info',
  modulo        VARCHAR(50)     NULL,
  referencia_id BIGINT UNSIGNED NULL,
  url_accion    VARCHAR(255)    NULL,
  leida         TINYINT(1)      NOT NULL DEFAULT 0,
  leida_en      TIMESTAMP       NULL,
  created_at    TIMESTAMP       NULL,
  updated_at    TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY notificaciones_usuario_leida (usuario_id, leida),
  CONSTRAINT notificaciones_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 27. PROGRAMA SST ANUAL
-- ============================================================
CREATE TABLE IF NOT EXISTS programa_sst (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id             BIGINT UNSIGNED NOT NULL,
  anio                   YEAR            NOT NULL,
  nombre                 VARCHAR(255)    NOT NULL DEFAULT '',
  objetivo               VARCHAR(255)    NOT NULL DEFAULT '',
  objetivo_general       TEXT            NULL,
  descripcion            TEXT            NULL,
  estado                 ENUM('borrador','activo','aprobado','en_ejecucion','completado','cerrado','cancelado') NOT NULL DEFAULT 'borrador',
  presupuesto            DECIMAL(12,2)   NULL,
  monto_total            DECIMAL(12,2)   NULL,
  presupuesto_ejecutado  DECIMAL(12,2)   NOT NULL DEFAULT 0,
  fecha_aprobacion       DATE            NULL,
  aprobado_por           BIGINT UNSIGNED NULL,
  created_at             TIMESTAMP       NULL,
  updated_at             TIMESTAMP       NULL,
  deleted_at             TIMESTAMP       NULL,
  PRIMARY KEY (id),
  CONSTRAINT programa_sst_empresa_id_foreign  FOREIGN KEY (empresa_id)  REFERENCES empresas (id) ON DELETE CASCADE,
  CONSTRAINT programa_sst_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programa_sst_actividades (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  programa_id      BIGINT UNSIGNED NOT NULL,
  objetivo         VARCHAR(255)    NULL,
  nombre           VARCHAR(255)    NULL DEFAULT '',
  descripcion      VARCHAR(255)    NOT NULL DEFAULT '',
  tipo             ENUM('capacitacion','inspeccion','simulacro','auditoria','monitoreo','otro') NOT NULL DEFAULT 'otro',
  fecha_programada DATE            NULL,
  fecha_inicio     DATE            NULL,
  fecha_fin        DATE            NULL,
  fecha_ejecutada  DATE            NULL,
  responsable_id   BIGINT UNSIGNED NULL,
  presupuesto      DECIMAL(10,2)   NULL,
  avance           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  estado           ENUM('pendiente','en_proceso','completado','cancelado','vencido') NOT NULL DEFAULT 'pendiente',
  observaciones    TEXT            NULL,
  created_at       TIMESTAMP       NULL,
  updated_at       TIMESTAMP       NULL,
  PRIMARY KEY (id),
  CONSTRAINT programa_actividades_programa_foreign    FOREIGN KEY (programa_id)    REFERENCES programa_sst (id) ON DELETE CASCADE,
  CONSTRAINT programa_actividades_responsable_foreign FOREIGN KEY (responsable_id) REFERENCES personal (id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 28. AUDITORÍA DE SISTEMA (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id     BIGINT UNSIGNED NULL,
  usuario_nombre VARCHAR(255)    NULL,
  modulo         VARCHAR(50)     NOT NULL,
  accion         VARCHAR(100)    NOT NULL,
  modelo         VARCHAR(100)    NULL,
  modelo_id      BIGINT UNSIGNED NULL,
  valor_anterior JSON            NULL,
  valor_nuevo    JSON            NULL,
  ip             VARCHAR(45)     NULL,
  user_agent     VARCHAR(500)    NULL,
  creado_en      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY auditoria_log_modulo_accion (modulo, accion),
  KEY auditoria_log_usuario_fecha (usuario_id, creado_en),
  KEY auditoria_log_modelo (modelo, modelo_id),
  CONSTRAINT auditoria_log_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 29. ALERTAS CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS alertas_config (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa_id           BIGINT UNSIGNED NOT NULL,
  tipo                 VARCHAR(100)    NOT NULL,
  dias_anticipacion    INT             NOT NULL DEFAULT 30,
  notificar_email      TINYINT(1)      NOT NULL DEFAULT 1,
  notificar_push       TINYINT(1)      NOT NULL DEFAULT 1,
  notificar_sms        TINYINT(1)      NOT NULL DEFAULT 0,
  roles_destinatarios  JSON            NULL,
  activa               TINYINT(1)      NOT NULL DEFAULT 1,
  created_at           TIMESTAMP       NULL,
  updated_at           TIMESTAMP       NULL,
  PRIMARY KEY (id),
  CONSTRAINT alertas_config_empresa_id_foreign FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DATOS INICIALES (seed)
-- ============================================================

-- Empresa demo
INSERT INTO empresas (razon_social, ruc, representante_legal, dni_representante, direccion, email, activa, created_at, updated_at)
VALUES ('ROKA SAC', '20123456789', 'Juan Pérez García', '12345678', 'Av. Industrial 123, Lima', 'admin@roka.pe', 1, NOW(), NOW());

-- Sede principal
INSERT INTO sedes (empresa_id, nombre, direccion, ciudad, activa, created_at, updated_at)
VALUES (1, 'Sede Principal', 'Av. Industrial 123', 'Lima', 1, NOW(), NOW());

-- Área
INSERT INTO areas (sede_id, nombre, tipo, activa, created_at, updated_at)
VALUES (1, 'Operaciones', 'taller', 1, NOW(), NOW());

-- Cargo
INSERT INTO cargos (empresa_id, nombre, requiere_emo, created_at, updated_at)
VALUES (1, 'Administrador SST', 1, NOW(), NOW());

-- Usuario administrador  (password: Admin123!)
INSERT INTO usuarios (empresa_id, personal_id, nombres, apellidos, nombre, email, password, rol, activo, created_at, updated_at)
VALUES (1, NULL, 'Admin', 'ROKA', 'Admin ROKA', 'admin@roka.pe',
  '$2y$12$eEBpzFXWfGHlzC2X7ZJH4.BoGaRhZO0vwEmDjrBF5HMwGJJ6VbAPm',
  'administrador', 1, NOW(), NOW());
