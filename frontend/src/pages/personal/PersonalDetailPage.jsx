import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, User, HardHat, HeartPulse, Calendar, Phone, Mail, MapPin } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const parseDate = (d) => d ? parseISO(d.length === 10 ? d + 'T00:00:00' : d) : null

const ESTADOS = {
  activo:     { label: 'Activo',      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  inactivo:   { label: 'Inactivo',    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  vacaciones: { label: 'Vacaciones',  color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  licencia:   { label: 'Licencia',    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

const RESULTADOS = {
  apto:                    { label: 'Apto',               color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  apto_con_restricciones:  { label: 'Apto c/Restricciones', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  no_apto:                 { label: 'No apto',            color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function PersonalDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [persona, setPersona] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historial, setHistorial] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const [rPersona, rHistorial] = await Promise.all([
          api.get(`/personal/${id}`),
          api.get(`/personal/${id}/historial-sst`).catch(() => ({ data: null })),
        ])
        setPersona(rPersona.data)
        setHistorial(rHistorial.data)
      } catch { /* silent */ } finally { setLoading(false) }
    }
    cargar()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  if (!persona) return <div className="text-center py-12 text-slate-500">Personal no encontrado</div>

  const iniciales = `${persona.nombres?.[0] || ''}${persona.apellidos?.[0] || ''}`.toUpperCase()
  const estadoBadge = ESTADOS[persona.estado] || ESTADOS.activo

  const ultimoEmo = historial?.ultimo_emo
  const restriccionesActivas = historial?.restricciones_activas || []
  const ultimasEntregas = historial?.ultimas_entregas_epp || []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => navigate(`/personal/${id}/editar`)}
          className="flex items-center gap-2 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm"
        >
          <Edit size={16} /> Editar
        </button>
      </div>

      {/* Perfil */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-roka-500/20 text-roka-300 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {iniciales}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{persona.nombres} {persona.apellidos}</h1>
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${estadoBadge.color}`}>
                {estadoBadge.label}
              </span>
            </div>
            <p className="text-slate-400 mt-1">{persona.cargo?.nombre || persona.cargo || 'Sin cargo'} · {persona.area?.nombre || 'Sin área'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Personal */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <User size={14} /> Datos Personales
          </h2>
          {[
            { label: 'DNI', value: persona.dni, mono: true },
            { label: 'Fecha nacimiento', value: persona.fecha_nacimiento ? format(parseDate(persona.fecha_nacimiento), 'dd/MM/yyyy') : '—' },
            { label: 'Sexo', value: persona.genero === 'M' ? 'Masculino' : persona.genero === 'F' ? 'Femenino' : '—' },
            { label: 'Celular', value: persona.telefono || '—', icon: Phone },
            { label: 'Email', value: persona.email || '—', icon: Mail },
            { label: 'Dirección', value: persona.direccion || '—', icon: MapPin },
          ].map(({ label, value, mono, icon: Icon }) => (
            <div key={label} className="flex justify-between items-start">
              <span className="text-xs text-slate-500">{label}</span>
              <span className={`text-sm text-slate-300 ${mono ? 'font-mono' : ''} text-right max-w-48`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Info Laboral */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} /> Datos Laborales
          </h2>
          {[
            { label: 'Área', value: persona.area?.nombre || '—' },
            { label: 'Cargo', value: persona.cargo?.nombre || persona.cargo || '—' },
            { label: 'Fecha ingreso', value: persona.fecha_ingreso ? format(parseDate(persona.fecha_ingreso), 'dd/MM/yyyy') : '—' },
            { label: 'Tipo contrato', value: persona.tipo_contrato || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-sm text-slate-300 capitalize">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Último EMO */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <HeartPulse size={14} /> Salud / EMO
        </h2>
        {ultimoEmo ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-medium capitalize">{ultimoEmo.tipo?.replace(/_/g, ' ')}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${RESULTADOS[ultimoEmo.resultado]?.color}`}>
                  {RESULTADOS[ultimoEmo.resultado]?.label || ultimoEmo.resultado}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Examen: {ultimoEmo.fecha_examen ? format(parseDate(ultimoEmo.fecha_examen), 'dd/MM/yyyy') : '—'}
                {ultimoEmo.fecha_vencimiento && ` · Vence: ${format(parseDate(ultimoEmo.fecha_vencimiento), 'dd/MM/yyyy')}`}
              </p>
            </div>
            <button onClick={() => navigate(`/salud/${ultimoEmo.id}`)}
              className="text-xs text-roka-400 hover:text-roka-300 px-3 py-1.5 rounded border border-roka-500/30 hover:border-roka-500/60">
              Ver detalle
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">Sin EMO registrado</p>
            <button onClick={() => navigate('/salud/nuevo')}
              className="text-xs text-roka-400 hover:text-roka-300">
              Registrar EMO
            </button>
          </div>
        )}

        {restriccionesActivas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-amber-400 font-medium mb-2">Restricciones activas ({restriccionesActivas.length})</p>
            {restriccionesActivas.map(r => (
              <div key={r.id} className="text-xs text-slate-400 py-1 border-b border-slate-700/50 last:border-0">
                {r.descripcion} — <span className="text-slate-500">{r.tipo_restriccion}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EPPs Asignados */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <HardHat size={14} /> EPPs Asignados
        </h2>
        {ultimasEntregas.length === 0 ? (
          <p className="text-slate-500 text-sm">Sin EPPs entregados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['EPP', 'Cantidad', 'Fecha', 'Estado'].map(h => (
                  <th key={h} className="text-left py-2 text-xs text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {ultimasEntregas.map(e => (
                <tr key={e.id}>
                  <td className="py-2 text-slate-300">{e.inventario?.nombre}</td>
                  <td className="py-2 text-slate-400">{e.cantidad}</td>
                  <td className="py-2 text-slate-400">{e.fecha_entrega ? format(parseDate(e.fecha_entrega), 'dd/MM/yyyy') : '—'}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.estado === 'entregado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {e.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
