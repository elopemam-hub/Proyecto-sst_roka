import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-10 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Algo salió mal</h1>
            <p className="text-slate-400 text-sm mt-2">
              Ocurrió un error inesperado en la aplicación.
            </p>
            {this.state.error && (
              <p className="text-xs text-slate-600 font-mono mt-3 bg-slate-800 rounded-lg px-3 py-2 text-left break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 mx-auto bg-roka-500 hover:bg-roka-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} /> Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }
}
