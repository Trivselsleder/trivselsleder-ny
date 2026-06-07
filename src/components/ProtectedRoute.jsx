import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, kreverRolle }) {
  const { session, bruker, laster } = useAuth()

  if (laster) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#F47920] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/logg-inn" replace />

  if (kreverRolle && bruker?.rolle !== kreverRolle) {
    return <Navigate to="/logg-inn" replace />
  }

  return children
}
