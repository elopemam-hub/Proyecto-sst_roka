import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchKpis = createAsyncThunk(
  'dashboard/fetchKpis',
  async (anio = new Date().getFullYear(), { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/dashboard/kpis?anio=${anio}`)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Error al cargar KPIs')
    }
  }
)

export const fetchAccidentabilidad = createAsyncThunk(
  'dashboard/fetchAccidentabilidad',
  async (anio = new Date().getFullYear()) => {
    const { data } = await api.get(`/dashboard/accidentabilidad?anio=${anio}`)
    return data
  }
)

export const fetchPorArea = createAsyncThunk(
  'dashboard/fetchPorArea',
  async () => {
    const { data } = await api.get('/dashboard/por-area')
    return data
  }
)

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    kpis:              null,
    accidentabilidad:  null,
    porArea:           [],
    loading:           false,
    lastUpdated:       null,
    error:             null,
  },
  reducers: {
    // Actualización en tiempo real vía WebSocket
    updateKpiRealtime: (state, { payload }) => {
      if (state.kpis) {
        state.kpis = { ...state.kpis, ...payload }
        state.lastUpdated = new Date().toISOString()
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKpis.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchKpis.fulfilled, (state, { payload }) => {
        state.loading     = false
        state.kpis        = payload
        state.lastUpdated = payload.actualizado_en
      })
      .addCase(fetchKpis.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
      .addCase(fetchAccidentabilidad.fulfilled, (state, { payload }) => {
        state.accidentabilidad = payload
      })
      .addCase(fetchPorArea.fulfilled, (state, { payload }) => {
        state.porArea = payload
      })
  },
})

export const { updateKpiRealtime } = dashboardSlice.actions

export const selectKpis             = (s) => s.dashboard.kpis
export const selectAccidentabilidad = (s) => s.dashboard.accidentabilidad
export const selectPorArea          = (s) => s.dashboard.porArea
export const selectDashboardLoading = (s) => s.dashboard.loading
export const selectLastUpdated      = (s) => s.dashboard.lastUpdated

export default dashboardSlice.reducer
