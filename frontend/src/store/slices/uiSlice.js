// uiSlice.js
import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen:    true,
    sidebarMobile:  false,
    activeModule:   'dashboard',
  },
  reducers: {
    toggleSidebar:       (state) => { state.sidebarOpen = !state.sidebarOpen },
    setSidebarMobile:    (state, { payload }) => { state.sidebarMobile = payload },
    setActiveModule:     (state, { payload }) => { state.activeModule = payload },
  },
})

export const { toggleSidebar, setSidebarMobile, setActiveModule } = uiSlice.actions
export const selectSidebarOpen   = (s) => s.ui.sidebarOpen
export const selectSidebarMobile = (s) => s.ui.sidebarMobile
export const selectActiveModule  = (s) => s.ui.activeModule
export default uiSlice.reducer
