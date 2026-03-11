import BasePokemon from '../../routes/api/pokemon.json/_pokemon.json'
import patches from '$lib/data/patches.json'

const PokemonEvolvedParentOverrides = {
  dragonier: 'dragonite'
}

const normalise = (value = '') =>
  `${value}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')

const unique = (items = []) => [...new Set(items.filter(Boolean))]

const baseLookup = Object.fromEntries(BasePokemon.map((pokemon) => [pokemon.alias, pokemon]))
const baseAliases = new Set(Object.keys(baseLookup))
const fakemon = patches['pokemon-evolved']?.fakemon || {}
const fakemonOrder = Object.keys(fakemon)

const parentMap = {}
const evoMap = {}
const addEvolution = (parent, child) => {
  if (!parent || !child || parent === child) return
  evoMap[parent] = unique([...(evoMap[parent] || []), child])
}

fakemonOrder.forEach((alias, index) => {
  const current = fakemon[alias]
  if (!current?.evoline) return

  if (PokemonEvolvedParentOverrides[alias]) {
    parentMap[alias] = PokemonEvolvedParentOverrides[alias]
    addEvolution(PokemonEvolvedParentOverrides[alias], alias)
    return
  }

  if (current.evoline !== alias) {
    parentMap[alias] = current.evoline
    addEvolution(current.evoline, alias)
    return
  }

  const previous = fakemonOrder[index - 1]
  if (baseAliases.has(alias) || !previous) return

  parentMap[alias] = previous
  addEvolution(previous, alias)
})

const lineCache = {}
const resolveLine = (alias, seen = new Set()) => {
  if (lineCache[alias]) return lineCache[alias]
  if (seen.has(alias))
    return (lineCache[alias] =
      baseLookup[alias]?.evoline || fakemon[alias]?.evoline || alias)

  const nextSeen = new Set(seen)
  nextSeen.add(alias)

  const parent = parentMap[alias]
  if (!parent)
    return (lineCache[alias] =
      baseLookup[alias]?.evoline || fakemon[alias]?.evoline || alias)

  if (fakemon[parent]) return (lineCache[alias] = resolveLine(parent, nextSeen))
  return (lineCache[alias] = baseLookup[parent]?.evoline || parent)
}

const topEvolutionCache = {}
const resolveTopEvolution = (alias, seen = new Set()) => {
  if (!alias || topEvolutionCache[alias]) return topEvolutionCache[alias] || alias
  if (seen.has(alias)) return alias

  const current = baseLookup[alias]
  if (!current) return alias

  const nextSeen = new Set(seen)
  nextSeen.add(alias)
  const next = (current.evos || []).find((evo) => baseLookup[evo])
  if (!next) return (topEvolutionCache[alias] = alias)

  return (topEvolutionCache[alias] = resolveTopEvolution(next, nextSeen))
}

const pokemonIconByKey = BasePokemon.reduce((acc, pokemon) => {
  for (const key of [pokemon.alias, pokemon.name, pokemon.label]) {
    if (!key) continue
    acc[normalise(key)] = pokemon.alias
  }
  return acc
}, {})

const fakemonIconByKey = Object.entries(fakemon).reduce((acc, [alias, pokemon]) => {
  const line = resolveLine(alias)
  const icon = baseLookup[line] ? resolveTopEvolution(line) : alias

  for (const key of [alias, pokemon.alias, pokemon.name, pokemon.label]) {
    if (!key) continue
    acc[normalise(key)] = icon
  }

  return acc
}, {})

export const resolvePokemonIconName = (name = '') => {
  const key = normalise(name)
  return fakemonIconByKey[key] || pokemonIconByKey[key] || name
}

