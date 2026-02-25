
import React from 'react';
import db from '../services/database';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Save to Firestore 'system_errors' collection (Sentry-lite approach)
    // We initiate this but don't await/block
    this.logErrorToDB(error, errorInfo);
  }

  logErrorToDB = async (error, errorInfo) => {
    try {
        await db.create('system_errors', {
            message: error.toString(),
            stack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    } catch (e) {
        console.error("Failed to log error to DB:", e);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-full text-center border border-red-100">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado.</h1>
                <p className="text-gray-600 mb-6">
                    Encontramos um erro inesperado. Nossa equipe de engenharia (o sistema automático) já foi notificada.
                </p>
                
                <details className="text-left bg-gray-100 p-4 rounded mb-6 overflow-auto max-h-40 text-xs text-gray-700 font-mono">
                    <summary className="cursor-pointer font-bold mb-2">Ver detalhes técnicos</summary>
                    {this.state.error && this.state.error.toString()}
                    <br />
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                </details>

                <div className="flex gap-4 justify-center">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Recarregar Página
                    </button>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                    >
                        Ir para Início
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
