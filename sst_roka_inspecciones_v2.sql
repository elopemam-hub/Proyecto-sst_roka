-- ============================================================
-- SST ROKA — Inspecciones v2: Checklist dinámico por catálogo
-- Ejecutar DESPUÉS de sst_roka_database.sql (tablas base ya existen)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── SUB-MÓDULOS DE INSPECCIÓN ────────────────────────────────
CREATE TABLE IF NOT EXISTS inspeccion_submodulos (
  id       TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo   CHAR(1) NOT NULL,
  nombre   VARCHAR(80) NOT NULL,
  color    VARCHAR(20) DEFAULT 'blue',
  activo   TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO inspeccion_submodulos (codigo, nombre, color) VALUES
  ('A', 'Equipos',         'blue'),
  ('B', 'Infraestructura', 'teal'),
  ('C', 'Emergencia',      'red');

-- ── CATÁLOGO DE EQUIPOS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipos_catalogo (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submodulo_id      TINYINT UNSIGNED NOT NULL,
  nombre            VARCHAR(100) NOT NULL,
  descripcion       TEXT,
  codigo            VARCHAR(30),
  requiere_operador TINYINT(1) DEFAULT 0,
  activo            TINYINT(1) DEFAULT 1,
  orden             SMALLINT DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submodulo_id) REFERENCES inspeccion_submodulos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO equipos_catalogo (submodulo_id, nombre, codigo, requiere_operador, orden) VALUES
  -- Sub-módulo A: Equipos (submodulo_id=1)
  (1, 'Barredora',         'EQ-001', 1,  1),
  (1, 'Lustradora',        'EQ-002', 1,  2),
  (1, 'Escalera móvil',   'EQ-003', 1,  3),
  (1, 'Gata',              'EQ-004', 1,  4),
  (1, 'Pistola neumática', 'EQ-005', 1,  5),
  (1, 'Kärchers',         'EQ-006', 1,  6),
  (1, 'Compresor de aire', 'EQ-007', 0,  7),
  (1, 'Grupo electrógeno', 'EQ-008', 0,  8),
  (1, 'Carretilla',        'EQ-009', 1,  9),
  (1, 'Stoka',             'EQ-010', 1, 10),
  (1, 'Trabarueda',        'EQ-011', 0, 11),
  (1, 'Apilador eléctrico','EQ-012', 1, 12),
  (1, 'EPPs',              'EQ-013', 0, 13),
  (1, 'Electricidad',      'EQ-014', 0, 14),
  (1, 'Tablero eléctrico', 'EQ-015', 0, 15),
  -- Sub-módulo B: Infraestructura (submodulo_id=2)
  (2, 'Inspección área',                'INF-001', 0, 1),
  (2, 'Rack',                           'INF-002', 0, 2),
  (2, 'Escalera fija / concreto',       'INF-003', 0, 3),
  (2, 'Orden y limpieza',               'INF-004', 0, 4),
  (2, 'Pisos y estructuras',            'INF-005', 0, 5),
  (2, 'Iluminación y ventilación',      'INF-006', 0, 6),
  (2, 'Instalaciones sanitarias',       'INF-007', 0, 7),
  (2, 'Trabajo en altura',              'INF-008', 0, 8),
  (2, 'Señalización',                   'INF-009', 0, 9),
  -- Sub-módulo C: Emergencia (submodulo_id=3)
  (3, 'Rutas de evacuación',            'EMG-001', 0,  1),
  (3, 'Detección y alarma',             'EMG-002', 0,  2),
  (3, 'Luz de emergencia',              'EMG-003', 0,  3),
  (3, 'Kit antiderrame',                'EMG-004', 0,  4),
  (3, 'Lavaojo',                        'EMG-005', 0,  5),
  (3, 'Extintor',                       'EMG-006', 0,  6),
  (3, 'Botiquín',                      'EMG-007', 0,  7),
  (3, 'DEA',                            'EMG-008', 0,  8),
  (3, 'Camilla',                        'EMG-009', 0,  9),
  (3, 'Desfibrilador',                  'EMG-010', 0, 10),
  (3, 'Gabinete contra incendio',       'EMG-011', 0, 11),
  (3, 'Materiales peligrosos MSDS',     'EMG-012', 0, 12),
  (3, 'Plan de emergencia',             'EMG-013', 0, 13),
  (3, 'Punto de reunión',              'EMG-014', 0, 14);

-- ── BANCO DE PREGUNTAS POR EQUIPO ────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_preguntas (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipo_id      INT UNSIGNED NOT NULL,
  orden          SMALLINT DEFAULT 0,
  texto          TEXT NOT NULL,
  tipo_respuesta ENUM('conf_nc_obs','si_no_na','texto','numero','fecha') DEFAULT 'conf_nc_obs',
  es_obligatoria TINYINT(1) DEFAULT 1,
  permite_foto   TINYINT(1) DEFAULT 1,
  permite_nota   TINYINT(1) DEFAULT 1,
  ayuda          TEXT,
  valor_limite   VARCHAR(80),
  activo         TINYINT(1) DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES equipos_catalogo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- equipo_id=1: Barredora
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (1,1,'¿El equipo está limpio y libre de residuos antes del uso?','conf_nc_obs',1,1,1),
  (1,2,'¿Los cepillos o rodillos están en buen estado, sin desgaste excesivo?','conf_nc_obs',1,1,1),
  (1,3,'¿El depósito de residuos está vacío y correctamente instalado?','si_no_na',1,0,0),
  (1,4,'¿El cable eléctrico está sin daños ni pelados?','conf_nc_obs',1,1,1),
  (1,5,'¿El operario cuenta con EPPs requeridos (calzado, guantes)?','si_no_na',1,0,0),
  (1,6,'¿El equipo tiene el sticker de revisión técnica vigente?','si_no_na',1,1,0),
  (1,7,'Fecha de último mantenimiento preventivo','fecha',1,0,1);

-- equipo_id=2: Lustradora
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (2,1,'¿El disco o almohadilla de trabajo está en buen estado?','conf_nc_obs',1,1,1),
  (2,2,'¿El cable de alimentación está sin daños visibles?','conf_nc_obs',1,1,0),
  (2,3,'¿El interruptor de encendido funciona correctamente?','si_no_na',1,0,1),
  (2,4,'¿El equipo está libre de fugas de producto (cera/limpiador)?','conf_nc_obs',1,1,1),
  (2,5,'¿El operario usa guantes y calzado antideslizante?','si_no_na',1,0,0);

-- equipo_id=3: Escalera móvil
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (3,1,'¿Los peldaños están completos, sin grietas ni deformaciones?','conf_nc_obs',1,1,1),
  (3,2,'¿Las zapatas antideslizantes están en buen estado?','conf_nc_obs',1,1,0),
  (3,3,'¿El sistema de bloqueo / traba funciona correctamente?','si_no_na',1,0,1),
  (3,4,'¿La estructura no presenta oxidación ni dobleces?','conf_nc_obs',1,1,1),
  (3,5,'¿La altura máxima está señalizada en el equipo?','si_no_na',1,0,0),
  (3,6,'¿El trabajador usa arnés al superar 1.80 m de altura?','si_no_na',1,0,1);

-- equipo_id=4: Gata
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (4,1,'¿La capacidad máxima de carga está señalizada?','si_no_na',1,0,0),
  (4,2,'¿El sistema hidráulico no presenta fugas de aceite?','conf_nc_obs',1,1,1),
  (4,3,'¿Las ruedas giran libremente y sin objetos incrustados?','conf_nc_obs',1,0,0),
  (4,4,'¿El mecanismo de subida/bajada opera sin resistencia anormal?','conf_nc_obs',1,0,1),
  (4,5,'Capacidad máxima indicada en el equipo (toneladas)','numero',1,0,0);

-- equipo_id=5: Pistola neumática
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (5,1,'¿La manguera de aire comprimido está sin grietas ni fugas?','conf_nc_obs',1,1,1),
  (5,2,'¿El gatillo de accionamiento funciona sin bloqueos?','si_no_na',1,0,1),
  (5,3,'¿La presión de trabajo está dentro del rango del equipo?','conf_nc_obs',1,0,1),
  (5,4,'¿El operario usa gafas, guantes y tapones auditivos?','si_no_na',1,0,0),
  (5,5,'¿Las conexiones rápidas de acople están en buen estado?','conf_nc_obs',1,1,0);

-- equipo_id=6: Kärchers
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (6,1,'¿La manguera de alta presión no presenta grietas ni abrasión?','conf_nc_obs',1,1,1),
  (6,2,'¿La lanza y boquilla están correctamente enroscadas?','si_no_na',1,0,0),
  (6,3,'¿El cable eléctrico está sin daños y el enchufe en buen estado?','conf_nc_obs',1,1,1),
  (6,4,'¿El depósito de detergente (si aplica) está limpio?','si_no_na',0,0,1),
  (6,5,'¿El operario usa traje impermeable, guantes y calzado adecuado?','si_no_na',1,0,0),
  (6,6,'¿La zona de trabajo está señalizada (piso mojado)?','si_no_na',1,1,0);

-- equipo_id=7: Compresor de aire
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (7,1,'¿El nivel de aceite está dentro del rango correcto?','conf_nc_obs',1,1,1),
  (7,2,'¿La válvula de seguridad opera correctamente (prueba manual)?','conf_nc_obs',1,0,1),
  (7,3,'¿El manómetro de presión es legible y está en rango operativo?','conf_nc_obs',1,1,0),
  (7,4,'¿El filtro de aire de entrada está limpio?','si_no_na',1,1,1),
  (7,5,'¿El depósito no presenta corrosión ni deformaciones?','conf_nc_obs',1,1,1),
  (7,6,'¿Se realizó el drenaje de condensado?','si_no_na',1,0,1),
  (7,7,'Presión máxima de trabajo (PSI / bar)','numero',1,0,0);

-- equipo_id=8: Grupo electrógeno
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (8,1,'¿El nivel de combustible es suficiente para la operación?','conf_nc_obs',1,1,0),
  (8,2,'¿El nivel de aceite de motor está en rango correcto?','conf_nc_obs',1,1,1),
  (8,3,'¿El sistema de escape está libre de obstrucciones?','si_no_na',1,1,1),
  (8,4,'¿El equipo opera en lugar ventilado o con extracción de gases?','si_no_na',1,0,1),
  (8,5,'¿El extintor de CO2 está disponible junto al equipo?','si_no_na',1,1,0),
  (8,6,'¿Las conexiones eléctricas de salida están en buen estado?','conf_nc_obs',1,1,1),
  (8,7,'Fecha de último mantenimiento','fecha',1,0,1);

-- equipo_id=9: Carretilla
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (9,1,'¿La estructura metálica no presenta grietas ni soldaduras rotas?','conf_nc_obs',1,1,1),
  (9,2,'¿Las ruedas están en buen estado y sin objetos incrustados?','conf_nc_obs',1,0,0),
  (9,3,'¿Las manijas de sujeción están completas y sin astillas?','conf_nc_obs',1,0,1),
  (9,4,'¿La carga transportada no supera la capacidad del equipo?','si_no_na',1,0,1);

-- equipo_id=10: Stoka
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (10,1,'¿Los horquilles están rectos y sin deformaciones?','conf_nc_obs',1,1,1),
  (10,2,'¿El sistema hidráulico no presenta fugas de aceite?','conf_nc_obs',1,1,1),
  (10,3,'¿Las ruedas giran libremente y están en buen estado?','conf_nc_obs',1,0,0),
  (10,4,'¿La bomba de accionamiento manual opera correctamente?','si_no_na',1,0,1),
  (10,5,'¿La capacidad máxima está señalizada en el equipo?','si_no_na',1,0,0);

-- equipo_id=11: Trabarueda
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (11,1,'¿El trabarueda está fabricado de material resistente (no improvisado)?','conf_nc_obs',1,1,1),
  (11,2,'¿Está correctamente calzado antes de operaciones de carga/descarga?','si_no_na',1,1,0),
  (11,3,'¿Se usan trabaruedas en ambas ruedas del vehículo?','si_no_na',1,1,0);

-- equipo_id=12: Apilador eléctrico
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (12,1,'¿La batería está cargada y el indicador en nivel adecuado?','conf_nc_obs',1,0,0),
  (12,2,'¿Los horquilles están rectos, sin fisuras ni deformaciones?','conf_nc_obs',1,1,1),
  (12,3,'¿El sistema de freno funciona correctamente?','si_no_na',1,0,1),
  (12,4,'¿Las ruedas están en buen estado y sin objetos incrustados?','conf_nc_obs',1,0,0),
  (12,5,'¿El operario cuenta con licencia interna vigente?','si_no_na',1,0,0),
  (12,6,'¿La bocina / alarma de retroceso funciona?','si_no_na',1,0,1),
  (12,7,'¿Las luces de trabajo funcionan correctamente?','si_no_na',0,0,0),
  (12,8,'Capacidad máxima señalizada en el equipo (kg)','numero',1,0,0);

-- equipo_id=13: EPPs
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (13,1,'¿El casco está libre de grietas, golpes o deformaciones visibles?','conf_nc_obs',1,1,1),
  (13,2,'¿Los lentes/caretas tienen visibilidad adecuada y están limpios?','conf_nc_obs',1,1,0),
  (13,3,'¿Los guantes son del tipo correcto para la tarea y están en buen estado?','conf_nc_obs',1,1,1),
  (13,4,'¿El calzado de seguridad tiene la punta de acero y suela sin desgaste?','conf_nc_obs',1,1,1),
  (13,5,'¿El tapón auditivo / orejera está en buen estado (si aplica)?','si_no_na',0,0,1),
  (13,6,'¿El arnés tiene revisión vigente y correas sin daños (si aplica)?','si_no_na',0,1,1),
  (13,7,'¿Los EPPs cuentan con fecha de vencimiento vigente?','conf_nc_obs',1,1,0);

-- equipo_id=14: Electricidad
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (14,1,'¿Los cables expuestos están canalizados o protegidos adecuadamente?','conf_nc_obs',1,1,1),
  (14,2,'¿Los tomacorrientes están en buen estado, sin partes rotas?','conf_nc_obs',1,1,0),
  (14,3,'¿No existen conexiones provisionales no autorizadas?','si_no_na',1,1,1),
  (14,4,'¿Las luminarias están operativas y correctamente fijadas?','conf_nc_obs',1,1,0),
  (14,5,'¿Existe sistema de puesta a tierra verificable?','si_no_na',1,0,1),
  (14,6,'¿La zona cuenta con señalización de riesgo eléctrico donde corresponde?','si_no_na',1,1,0);

-- equipo_id=15: Tablero eléctrico
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (15,1,'¿La tapa del tablero está instalada y asegurada correctamente?','conf_nc_obs',1,1,0),
  (15,2,'¿Los breakers/interruptores están debidamente identificados?','conf_nc_obs',1,1,1),
  (15,3,'¿Existe señalización de riesgo eléctrico en la puerta del tablero?','si_no_na',1,0,0),
  (15,4,'¿El tablero está libre de humedad, polvo excesivo o residuos?','conf_nc_obs',1,1,1),
  (15,5,'¿No hay cables pelados, empalmes sin aislamiento ni terminales sueltos?','conf_nc_obs',1,1,1),
  (15,6,'¿El tablero es accesible y sin objetos bloqueando el frente?','si_no_na',1,1,0),
  (15,7,'Fecha de última revisión por técnico autorizado','fecha',1,0,1);

-- equipo_id=16: Inspección área
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (16,1,'¿El área cuenta con la señalización reglamentaria visible?','conf_nc_obs',1,1,1),
  (16,2,'¿Los pasillos y vías de circulación están despejados?','conf_nc_obs',1,1,0),
  (16,3,'¿Los puntos de acopio de residuos están identificados y no desbordados?','conf_nc_obs',1,1,1),
  (16,4,'¿Existen riesgos evidentes no controlados en el área?','si_no_na',1,1,1);

-- equipo_id=17: Rack
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (17,1,'¿La estructura del rack no presenta deformaciones ni impactos visibles?','conf_nc_obs',1,1,1),
  (17,2,'¿Los pines de seguridad de las vigas están correctamente colocados?','conf_nc_obs',1,1,0),
  (17,3,'¿La capacidad de carga por nivel está señalizada y respetada?','conf_nc_obs',1,1,1),
  (17,4,'¿El rack está anclado al piso o pared según diseño?','si_no_na',1,1,1),
  (17,5,'¿Las cargas están centradas y no sobresalen del borde?','conf_nc_obs',1,1,0);

-- equipo_id=18: Escalera fija/concreto
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (18,1,'¿Los peldaños están completos, sin grietas ni bordes sueltos?','conf_nc_obs',1,1,1),
  (18,2,'¿Los pasamanos están presentes en ambos lados y bien fijados?','conf_nc_obs',1,1,0),
  (18,3,'¿La superficie de los peldaños es antideslizante?','conf_nc_obs',1,1,1),
  (18,4,'¿La escalera cuenta con iluminación suficiente?','si_no_na',1,0,1);

-- equipo_id=19: Orden y limpieza
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (19,1,'¿Los pisos están limpios, secos y sin materiales fuera de lugar?','conf_nc_obs',1,1,1),
  (19,2,'¿Los materiales y herramientas tienen un lugar definido y están en él?','conf_nc_obs',1,1,1),
  (19,3,'¿Los contenedores de residuos están identificados por tipo?','conf_nc_obs',1,1,0),
  (19,4,'¿No existe acumulación de materiales innecesarios en el área?','si_no_na',1,1,1),
  (19,5,'¿Las zonas de trabajo están delimitadas y señalizadas?','conf_nc_obs',1,1,0);

-- equipo_id=20: Pisos y estructuras
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (20,1,'¿Los pisos están libres de grietas, hundimientos o desniveles?','conf_nc_obs',1,1,1),
  (20,2,'¿Las superficies son antideslizantes en zonas húmedas o con grasa?','conf_nc_obs',1,1,1),
  (20,3,'¿Las rejillas y tapas de registro están aseguradas y en buen estado?','conf_nc_obs',1,1,0),
  (20,4,'¿Columnas y vigas sin fisuras, corrosión o deformaciones visibles?','conf_nc_obs',1,1,1),
  (20,5,'¿Los techos sin filtraciones, pandeo ni elementos sueltos?','conf_nc_obs',1,1,1),
  (20,6,'¿Las canaletas y sumideros están limpios y funcionales?','si_no_na',1,1,0);

-- equipo_id=21: Iluminación y ventilación
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota,ayuda,valor_limite) VALUES
  (21,1,'¿El nivel de iluminación es adecuado para la tarea realizada?','conf_nc_obs',1,1,1,'Verificar con luxómetro si hay duda',NULL),
  (21,2,'Medición de iluminación en plano de trabajo (lux)','numero',1,0,1,'Mínimo: 300 lx taller, 500 lx oficina','>=300 lx');
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (21,3,'¿Las luminarias están operativas, sin focos fundidos ni parpadeos?','conf_nc_obs',1,1,0),
  (21,4,'¿La iluminación de emergencia activa ante corte de energía?','si_no_na',1,0,1),
  (21,5,'¿La ventilación natural o forzada es suficiente en el área?','conf_nc_obs',1,1,1),
  (21,6,'¿Los extractores y rejillas de ventilación están operativos y limpios?','conf_nc_obs',1,1,0),
  (21,7,'¿No hay acumulación de vapores, humos o gases en zona de trabajo?','si_no_na',1,1,1);

-- equipo_id=22: Instalaciones sanitarias
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (22,1,'¿La dotación de SS.HH. es suficiente para el número de trabajadores?','conf_nc_obs',1,0,1),
  (22,2,'¿Los inodoros y urinarios están operativos y limpios?','conf_nc_obs',1,1,1),
  (22,3,'¿Los lavatorios tienen agua, jabón y papel disponibles?','conf_nc_obs',1,1,0),
  (22,4,'¿Los vestuarios tienen casilleros individuales con cerrojo?','si_no_na',1,1,1),
  (22,5,'¿El comedor está separado de zonas de producción y limpio?','conf_nc_obs',1,1,1),
  (22,6,'¿El dispensador de agua potable está operativo?','si_no_na',1,0,0);

-- equipo_id=23: Trabajo en altura
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (23,1,'¿Existe permiso de trabajo en altura emitido y vigente?','si_no_na',1,1,1),
  (23,2,'¿Los andamios tienen barandas a 90 cm y rodapié en buen estado?','conf_nc_obs',1,1,1),
  (23,3,'¿Los trabajadores usan arnés anclado a punto certificado?','si_no_na',1,1,0),
  (23,4,'¿El área inferior está delimitada y señalizada?','si_no_na',1,1,0),
  (23,5,'¿Las plataformas de trabajo tienen superficie antideslizante?','conf_nc_obs',1,1,1);

-- equipo_id=24: Señalización
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (24,1,'¿Las señales de evacuación son visibles y están correctamente ubicadas?','conf_nc_obs',1,1,1),
  (24,2,'¿La demarcación de pisos (amarillo) está en buen estado y visible?','conf_nc_obs',1,1,0),
  (24,3,'¿Las señales de obligación de EPPs están en zonas de riesgo?','conf_nc_obs',1,1,0),
  (24,4,'¿Las señales de advertencia (triángulo) están en zonas de peligro?','conf_nc_obs',1,1,1),
  (24,5,'¿Los extintores, botiquines y salidas tienen señalización visible?','conf_nc_obs',1,1,0);

-- equipo_id=25: Rutas de evacuación
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (25,1,'¿Las rutas de evacuación están señalizadas con flechas y colores?','conf_nc_obs',1,1,1),
  (25,2,'¿Los pasillos de evacuación están libres de obstáculos?','conf_nc_obs',1,1,0),
  (25,3,'¿Las puertas de emergencia abren hacia afuera y sin llave?','si_no_na',1,1,1),
  (25,4,'¿El mapa de evacuación está visible y actualizado?','si_no_na',1,1,0),
  (25,5,'¿La iluminación en rutas de evacuación es adecuada?','conf_nc_obs',1,1,1);

-- equipo_id=26: Detección y alarma
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (26,1,'¿Los detectores de humo/calor están operativos (luz indicadora)?','conf_nc_obs',1,1,1),
  (26,2,'¿La sirena/alarma de emergencia se escucha en toda la instalación?','si_no_na',1,0,1),
  (26,3,'¿El panel de control de alarmas indica estado normal?','conf_nc_obs',1,1,1),
  (26,4,'¿Los pulsadores manuales de alarma están accesibles y señalizados?','conf_nc_obs',1,1,0);

-- equipo_id=27: Luz de emergencia
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (27,1,'¿Las luces de emergencia se activan al cortar la energía eléctrica?','si_no_na',1,0,1),
  (27,2,'¿La autonomía de la batería es suficiente (mín. 90 min)?','conf_nc_obs',1,0,1),
  (27,3,'¿Las luces están ubicadas en rutas de evacuación y salidas?','conf_nc_obs',1,1,0),
  (27,4,'Fecha de última prueba funcional','fecha',1,0,1);

-- equipo_id=28: Kit antiderrame
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (28,1,'¿El kit está completo: absorbentes, guantes, bolsas, señalización?','conf_nc_obs',1,1,1),
  (28,2,'¿El kit está en lugar accesible y señalizado?','si_no_na',1,1,0),
  (28,3,'¿Los absorbentes no están saturados ni vencidos?','conf_nc_obs',1,1,1),
  (28,4,'¿El personal conoce el procedimiento de uso?','si_no_na',1,0,1);

-- equipo_id=29: Lavaojo
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (29,1,'¿El lavaojo está operativo con flujo continuo de agua?','conf_nc_obs',1,1,1),
  (29,2,'¿Está ubicado a menos de 10 segundos de distancia de zona de riesgo?','si_no_na',1,1,1),
  (29,3,'¿El área alrededor está libre de obstáculos?','si_no_na',1,1,0),
  (29,4,'¿La señalización del lavaojo es visible desde la zona de trabajo?','si_no_na',1,1,0),
  (29,5,'Fecha de última limpieza y revisión','fecha',1,0,1);

-- equipo_id=30: Extintor
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (30,1,'¿El extintor tiene el precinto de seguridad intacto?','conf_nc_obs',1,1,0),
  (30,2,'¿La presión del manómetro está en zona verde (operativo)?','conf_nc_obs',1,1,1),
  (30,3,'¿La etiqueta de inspección periódica está vigente?','conf_nc_obs',1,1,0),
  (30,4,'¿El tipo de extintor es el correcto para el riesgo del área?','si_no_na',1,0,1),
  (30,5,'¿El extintor está accesible, sin obstáculos y a 1.50 m de altura?','conf_nc_obs',1,1,0),
  (30,6,'¿La señalización del extintor es visible?','si_no_na',1,1,0),
  (30,7,'Fecha de vencimiento de carga','fecha',1,1,1);

-- equipo_id=31: Botiquín
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (31,1,'¿El botiquín está completo según el listado mínimo de RM-111?','conf_nc_obs',1,1,1),
  (31,2,'¿Los medicamentos e insumos están dentro de fecha de vencimiento?','conf_nc_obs',1,1,0),
  (31,3,'¿El botiquín está accesible y señalizado?','si_no_na',1,1,0),
  (31,4,'¿El responsable de primeros auxilios está identificado?','si_no_na',1,0,1),
  (31,5,'Fecha de última revisión del botiquín','fecha',1,0,1);

-- equipo_id=32: DEA
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (32,1,'¿El DEA muestra luz verde / estado listo para uso?','conf_nc_obs',1,1,0),
  (32,2,'¿Los electrodos están vigentes (fecha de vencimiento)?','conf_nc_obs',1,1,1),
  (32,3,'¿El equipo está accesible y señalizado correctamente?','si_no_na',1,1,0),
  (32,4,'¿Existe personal capacitado en uso del DEA en el turno?','si_no_na',1,0,1),
  (32,5,'Fecha de última verificación del equipo','fecha',1,0,1);

-- equipo_id=33: Camilla
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (33,1,'¿La camilla está en buen estado, sin roturas ni deformaciones?','conf_nc_obs',1,1,1),
  (33,2,'¿Las correas de sujeción están completas y operativas?','conf_nc_obs',1,1,0),
  (33,3,'¿La camilla está accesible y sin obstáculos alrededor?','si_no_na',1,1,0);

-- equipo_id=34: Desfibrilador
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (34,1,'¿El desfibrilador muestra indicador de carga y operativo?','conf_nc_obs',1,1,1),
  (34,2,'¿La batería está en buen estado y dentro de fecha?','conf_nc_obs',1,1,1),
  (34,3,'¿Los parches/paletas están vigentes y disponibles?','conf_nc_obs',1,1,0),
  (34,4,'Fecha de última revisión técnica','fecha',1,0,1);

-- equipo_id=35: Gabinete contra incendio
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (35,1,'¿La manguera contra incendio está correctamente enrollada?','conf_nc_obs',1,1,1),
  (35,2,'¿La lanza está presente y en buen estado?','conf_nc_obs',1,1,0),
  (35,3,'¿La válvula de apertura opera sin resistencia anormal?','conf_nc_obs',1,0,1),
  (35,4,'¿El gabinete está señalizado y accesible?','si_no_na',1,1,0),
  (35,5,'¿La presión de agua en la red está dentro del rango?','conf_nc_obs',1,0,1);

-- equipo_id=36: Materiales peligrosos MSDS
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (36,1,'¿Las MSDS de todos los productos usados están disponibles y vigentes?','conf_nc_obs',1,1,1),
  (36,2,'¿Los contenedores de sustancias peligrosas están correctamente rotulados?','conf_nc_obs',1,1,1),
  (36,3,'¿El almacenamiento es compatible (no mezcla de incompatibles)?','conf_nc_obs',1,1,1),
  (36,4,'¿Los contenedores están cerrados cuando no se usan?','si_no_na',1,1,0),
  (36,5,'¿El personal usa EPPs adecuados al manipular sustancias peligrosas?','si_no_na',1,1,0);

-- equipo_id=37: Plan de emergencia
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (37,1,'¿El plan de emergencia está aprobado y vigente?','conf_nc_obs',1,1,1),
  (37,2,'¿Los trabajadores conocen su rol en caso de emergencia?','si_no_na',1,0,1),
  (37,3,'¿El listado de brigadistas actualizado está publicado?','si_no_na',1,1,0),
  (37,4,'¿Los números de emergencia están visibles (bomberos, SAMU, etc.)?','si_no_na',1,1,0),
  (37,5,'Fecha de última actualización del plan','fecha',1,0,1);

-- equipo_id=38: Punto de reunión
INSERT INTO checklist_preguntas (equipo_id,orden,texto,tipo_respuesta,es_obligatoria,permite_foto,permite_nota) VALUES
  (38,1,'¿El punto de reunión está señalizado con señal verde y visible?','conf_nc_obs',1,1,1),
  (38,2,'¿El área del punto de reunión tiene capacidad suficiente?','conf_nc_obs',1,1,1),
  (38,3,'¿El acceso al punto de reunión está libre de obstáculos?','si_no_na',1,1,0),
  (38,4,'¿Los trabajadores conocen la ubicación del punto de reunión?','si_no_na',1,0,1);

-- ── RESPUESTAS DE CHECKLIST ──────────────────────────────────
CREATE TABLE IF NOT EXISTS inspeccion_respuestas (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inspeccion_id BIGINT UNSIGNED NOT NULL,
  pregunta_id   INT UNSIGNED NOT NULL,
  resultado     VARCHAR(10),
  nota          TEXT,
  foto_path     VARCHAR(255),
  respondido_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE,
  FOREIGN KEY (pregunta_id)   REFERENCES checklist_preguntas(id),
  UNIQUE KEY uq_resp (inspeccion_id, pregunta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── FIRMAS CANVAS (modo checklist) ──────────────────────────
CREATE TABLE IF NOT EXISTS inspeccion_firmas_canvas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inspeccion_id   BIGINT UNSIGNED NOT NULL,
  rol_firma       ENUM('inspector','responsable_area','supervisor','trabajador') NOT NULL,
  usuario_id      BIGINT UNSIGNED,
  nombre_firmante VARCHAR(120),
  firma_base64    MEDIUMTEXT,
  ip_firma        VARCHAR(45),
  firmado_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ACCIONES CORRECTIVAS (desde checklist) ──────────────────
CREATE TABLE IF NOT EXISTS inspeccion_acciones_checklist (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inspeccion_id    BIGINT UNSIGNED NOT NULL,
  pregunta_id      INT UNSIGNED,
  descripcion      TEXT NOT NULL,
  responsable_id   BIGINT UNSIGNED,
  fecha_compromiso DATE,
  prioridad        ENUM('alta','media','baja') DEFAULT 'media',
  estado           ENUM('pendiente','en_proceso','cerrado') DEFAULT 'pendiente',
  porcentaje       TINYINT DEFAULT 0,
  evidencia        TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id),
  FOREIGN KEY (pregunta_id)   REFERENCES checklist_preguntas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ALTER TABLE inspecciones (añadir campos modo catálogo) ───
ALTER TABLE inspecciones
  ADD COLUMN IF NOT EXISTS submodulo_id       TINYINT UNSIGNED NULL       AFTER tipo,
  ADD COLUMN IF NOT EXISTS equipo_catalogo_id INT UNSIGNED NULL            AFTER submodulo_id,
  ADD COLUMN IF NOT EXISTS turno              ENUM('mañana','tarde','noche') NULL AFTER equipo_catalogo_id,
  ADD COLUMN IF NOT EXISTS items_conformes    SMALLINT DEFAULT 0           AFTER porcentaje_cumplimiento,
  ADD COLUMN IF NOT EXISTS items_nc           SMALLINT DEFAULT 0           AFTER items_conformes,
  ADD COLUMN IF NOT EXISTS items_obs          SMALLINT DEFAULT 0           AFTER items_nc;

-- Añadir FK (solo si no existen aún)
ALTER TABLE inspecciones
  ADD CONSTRAINT fk_ins_submodulo   FOREIGN KEY (submodulo_id)       REFERENCES inspeccion_submodulos(id),
  ADD CONSTRAINT fk_ins_equipo_cat  FOREIGN KEY (equipo_catalogo_id) REFERENCES equipos_catalogo(id);

SET FOREIGN_KEY_CHECKS = 1;
