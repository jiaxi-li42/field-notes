'use client'

import { useEffect } from 'react'
import { OverlayScrollbars } from 'overlayscrollbars'
import 'overlayscrollbars/overlayscrollbars.css'
import { OS_OPTIONS } from '@/components/ui/overlay-scrollbars'

/**
 * Wires OverlayScrollbars to the document body — the app's top-level
 * scroll container. OS treats body init specially: it uses `<html>` as
 * the viewport and `<body>` as the scroll content.
 */
export function OverlayScrollbarsInit() {
  useEffect(() => {
    const osInstance = OverlayScrollbars(document.body, OS_OPTIONS)
    return () => osInstance.destroy()
  }, [])
  return null
}
