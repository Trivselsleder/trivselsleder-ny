import { useEffect } from 'react'
import { useBrukslogg } from '../hooks/useBrukslogg'

export default function LoggSidevisning({ skoleId = null }) {
  const loggBrukslogg = useBrukslogg(skoleId)
  useEffect(() => { loggBrukslogg('sidevisning') }, [])
  return null
}
