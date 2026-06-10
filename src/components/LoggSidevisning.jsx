import { useEffect } from 'react'
import { useBrukslogg } from '../hooks/useBrukslogg'

export default function LoggSidevisning({ skoleId = null }) {
  const logg = useBrukslogg(skoleId)
  useEffect(() => { logg('sidevisning') }, [])
  return null
}
