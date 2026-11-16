// I 20 gruppi muscolari della mappa del corpo (indipendenti dal modello dati degli esercizi).

export const BODY_GROUPS = [
  { id: 'front_delts', it: 'Deltoide anteriore', en: 'Front delt' },
  { id: 'side_delts', it: 'Deltoide laterale', en: 'Side delt' },
  { id: 'rear_delts', it: 'Deltoide posteriore', en: 'Rear delt' },
  { id: 'biceps', it: 'Bicipite', en: 'Biceps' },
  { id: 'triceps', it: 'Tricipite', en: 'Triceps' },
  { id: 'forearms', it: 'Avambracci', en: 'Forearms' },
  { id: 'upper_chest', it: 'Pettorale alto', en: 'Upper chest' },
  { id: 'chest', it: 'Pettorale', en: 'Chest' },
  { id: 'abs', it: 'Addominali', en: 'Abs' },
  { id: 'obliques', it: 'Obliqui', en: 'Obliques' },
  { id: 'lats', it: 'Dorsali', en: 'Lats' },
  { id: 'mid_back', it: 'Schiena media', en: 'Mid back' },
  { id: 'upper_traps', it: 'Trapezio alto', en: 'Upper traps' },
  { id: 'lower_back', it: 'Lombari', en: 'Lower back' },
  { id: 'quads', it: 'Quadricipiti', en: 'Quads' },
  { id: 'adductors', it: 'Adduttori', en: 'Adductors' },
  { id: 'abductors', it: 'Abduttori', en: 'Abductors' },
  { id: 'glutes', it: 'Glutei', en: 'Glutes' },
  { id: 'hamstrings', it: 'Femorali', en: 'Hamstrings' },
  { id: 'calves', it: 'Polpacci', en: 'Calves' },
] as const

export type BodyGroup = (typeof BODY_GROUPS)[number]['id']

export function groupName(id: BodyGroup, lang: 'it' | 'en'): string {
  return BODY_GROUPS.find((g) => g.id === id)?.[lang] ?? id
}
