const DISPLAY_ENTITY_ALIAS: Record<string, string> = {
  MYTH: "CHAR",
}

const CANONICAL_ENTITY_ALIAS: Record<string, string> = {
  CHAR: "MYTH",
}

function splitBioLabel(label: string): { prefix: string; entity: string } | null {
  if (label === "O") return null
  const [prefix, entity] = label.split("-")
  if (!prefix || !entity) return null
  return { prefix, entity }
}

export function toDisplayBioLabel(label: string): string {
  const parsed = splitBioLabel(label)
  if (!parsed) {
    return DISPLAY_ENTITY_ALIAS[label] ?? label
  }

  const displayEntity = DISPLAY_ENTITY_ALIAS[parsed.entity] ?? parsed.entity
  return `${parsed.prefix}-${displayEntity}`
}

export function toCanonicalBioLabel(label: string): string {
  const parsed = splitBioLabel(label)
  if (!parsed) {
    return CANONICAL_ENTITY_ALIAS[label] ?? label
  }

  const canonicalEntity = CANONICAL_ENTITY_ALIAS[parsed.entity] ?? parsed.entity
  return `${parsed.prefix}-${canonicalEntity}`
}

export function toDisplayTransitionLabel(transition: string): string {
  const [oldLabel, newLabel] = transition.split("->")
  if (!oldLabel || !newLabel) return transition
  return `${toDisplayBioLabel(oldLabel)}->${toDisplayBioLabel(newLabel)}`
}