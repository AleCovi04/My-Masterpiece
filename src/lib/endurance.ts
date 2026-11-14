import type { EndurancePlan } from '../data/types'

/** Durata stimata in secondi (arrotondata). */
export function estimateDurationSeconds(plan: EndurancePlan): number {
  switch (plan.discipline) {
    case 'run':
      if (plan.mode === 'steady') {
        return Math.round((plan.distanceM / 1000) * plan.paceSecPerKm)
      }
      return Math.round(
        plan.intervals.reduce(
          (sum, i) =>
            sum + (i.distanceM / 1000) * i.paceSecPerKm + i.walkRestSeconds,
          0,
        ),
      )
    case 'bike':
      return Math.round((plan.distanceM / 1000 / plan.avgSpeedKmh) * 3600)
    case 'swim':
      return Math.round((plan.distanceM / 100) * plan.paceSecPer100m)
  }
}
