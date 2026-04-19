import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ── Thunks ────────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('sst_token', data.token)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Error al iniciar sesión')
    }
  }
)

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me')
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Sesión expirada')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout')
    } catch (_) { /* ignorar error */ }
    localStorage.removeItem('sst_token')
    delete api.defaults.headers.common['Authorization']
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:        null,
    token:       localStorage.getItem('sst_token') || null,
    loading:     false,
    initialized: false,
    error:       null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading     = false
        state.token       = payload.token
        state.user        = payload.user
        state.initialized = true
      })
      .addCase(login.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
      // Fetch Me
      .addCase(fetchMe.pending,   (state) => { state.loading = true })
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.loading     = false
        state.user        = payload
        state.initialized = true
      })
      .addCase(fetchMe.rejected,  (state) => {
        state.loading     = false
        state.user        = null
        state.token       = null
        state.initialized = true
        localStorage.removeItem('sst_token')
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user        = null
        state.token       = null
        state.initialized = true
      })
  },
})

export const { clearError } = authSlice.actions

// Selectores
export const selectUser        = (s) => s.auth.user
export const selectIsAuth      = (s) => !!s.auth.token && !!s.auth.user
export const selectAuthLoading = (s) => s.auth.loading
export const selectAuthError   = (s) => s.auth.error
export const selectInitialized = (s) => s.auth.initialized

export default authSlice.reducer
