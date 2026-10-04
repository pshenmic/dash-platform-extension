import React from 'react'
import styles from './DashboardGridBackground.module.pcss'

/**
 * Figma "Grid (Stroke)" — hairline cells fading in toward the top-right.
 * CSS instead of the exported 1034×812 path SVG.
 */
export function DashboardGridBackground (): React.JSX.Element {
  return <div aria-hidden className={styles.grid} />
}
