'use client'

import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentProps,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react'
import type { PartialOptions } from 'overlayscrollbars'

/**
 * Shared OverlayScrollbars config. Used by the body init and every
 * `<OverlayScrollArea>` so all scroll surfaces get the same theme.
 */
export const OS_OPTIONS: PartialOptions = {
  scrollbars: {
    theme: 'os-theme-dark',
    autoHide: 'scroll',
    autoHideDelay: 800,
  },
}

export type OverlayScrollAreaRef = OverlayScrollbarsComponentRef

/**
 * Thin wrapper that applies `OS_OPTIONS` so call sites stay consistent.
 * `options` can still be overridden by the caller if needed.
 */
export function OverlayScrollArea({
  options,
  ...props
}: OverlayScrollbarsComponentProps<'div'>) {
  return (
    <OverlayScrollbarsComponent options={options ?? OS_OPTIONS} {...props} />
  )
}
