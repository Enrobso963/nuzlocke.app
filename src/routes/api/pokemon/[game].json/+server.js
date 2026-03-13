import { Expanded as games } from '$lib/data/games.js'
import patches from '$lib/data/patches.json'
import routeData from '$lib/data/routes.json'
import { resolvePokemonIconName } from '$lib/utils/pokemon-evolved'

import { LegacyTypeMap } from '$lib/data/legacy'
import Pokemon, { filterdata, sumObj } from '../../pokemon.json/_data.js'

const base = filterdata(Pokemon)
const baseLookup = Object.fromEntries(base.map((p) => [p.alias, p]))
const unique = (items = []) => [...new Set(items.filter(Boolean))]
const PokemonEvolvedParentOverrides = {
  dragonier: 'dragonite'
}

const patchTypes = (pkmn, typeMap) => {
  if (!typeMap) return pkmn
  return pkmn.map((p) => {
    const patch = typeMap[p.alias] || typeMap[p.sprite] || {}
    const types = patch.types || p.types
    return { ...p, types }
  })
}

const patchPokemon = (pkmn, patches = {}, fakemon = {}) => {
  return pkmn
    .map((p) => {
      const patch = patches[p.alias] || patches[p.sprite] || {}
      const baseStats = {
        ...p.baseStats,
        ...(patch.stats || {})
      }

      const total = sumObj(baseStats)

      return {
        ...p,
        types: patch.types || p.types,
        evos: patch?.evos || p.evos,
        evoline: patch?.evoline || p.evoline,
        canEncounter: patch.canEncounter ?? p.canEncounter,
        baseStats,
        total
      }
    })
    .concat(Object.values(fakemon || {}))
}

const patchPokemonEvolved = (gameId, pokemon = {}, fakemon = {}) => {
  if (gameId !== 'pokemon-evolved') return { pokemon, fakemon }

  const order = Object.keys(fakemon)
  const encounterable = new Set(
    (routeData[gameId] || []).flatMap((route) => route.encounters || [])
  )
  const baseAliases = new Set(Object.keys(baseLookup))
  const parentMap = {}
  const evoMap = {}
  const addEvolution = (parent, child) => {
    if (!parent || !child || parent === child) return
    evoMap[parent] = unique([...(evoMap[parent] || []), child])
  }

  order.forEach((alias, index) => {
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

    const previous = order[index - 1]
    if (baseAliases.has(alias) || !previous) return

    parentMap[alias] = previous
    addEvolution(previous, alias)
  })

  const lineCache = {}
  const resolveLine = (alias, seen = new Set()) => {
    if (lineCache[alias]) return lineCache[alias]
    if (seen.has(alias))
      return (lineCache[alias] =
        pokemon[alias]?.evoline || baseLookup[alias]?.evoline || fakemon[alias]?.evoline || alias
      )
    const nextSeen = new Set(seen)
    nextSeen.add(alias)

    const parent = parentMap[alias]
    if (!parent)
      return (lineCache[alias] =
        pokemon[alias]?.evoline || baseLookup[alias]?.evoline || fakemon[alias]?.evoline || alias)

    if (fakemon[parent])
      return (lineCache[alias] = resolveLine(parent, nextSeen))

    return (lineCache[alias] =
      pokemon[parent]?.evoline || baseLookup[parent]?.evoline || parent)
  }

  const patchedPokemon = { ...pokemon }
  for (const alias of encounterable) {
    if (fakemon[alias]) continue
    patchedPokemon[alias] = {
      ...(patchedPokemon[alias] || {}),
      canEncounter: true
    }
  }

  for (const [parent, evos] of Object.entries(evoMap)) {
    if (fakemon[parent]) continue
    patchedPokemon[parent] = {
      ...(patchedPokemon[parent] || {}),
      evos: unique([...(patchedPokemon[parent]?.evos || []), ...evos])
    }
  }

  const searchable = new Set(encounterable)
  for (const pokemon of base) {
    if (searchable.has(pokemon.alias)) continue
    if (encounterable.has(pokemon.evoline)) searchable.add(pokemon.alias)
  }
  const queue = [...searchable]
  for (let index = 0; index < queue.length; index += 1) {
    const alias = queue[index]
    for (const evo of evoMap[alias] || []) {
      if (searchable.has(evo)) continue
      searchable.add(evo)
      queue.push(evo)
    }
  }

  const patchedFakemon = Object.fromEntries(
    order.map((alias) => {
      const current = fakemon[alias]
      return [
        alias,
        {
          ...current,
          sprite: current.alias || alias,
          icon: current.icon || resolvePokemonIconName(alias),
          canEncounter: current.canEncounter ?? searchable.has(alias),
          evos: unique([...(current.evos || []), ...(evoMap[alias] || [])]),
          evoline: resolveLine(alias)
        }
      ]
    })
  )

  return { pokemon: patchedPokemon, fakemon: patchedFakemon }
}

export async function GET({ params }) {
  const game = games[params.game]
  const patch = patches[game?.patchId] || patches[params.game] || {}
  const { pokemon, fakemon } = patchPokemonEvolved(
    game?.patchId || params.game,
    patch.pokemon,
    patch.fakemon
  )

  if (!game) return new Response('', { status: 404 })
  if (!game.patched && !game.filter)
    return new Response('', {
      status: 301,
      headers: { Location: '/api/pokemon.json' }
    })

  let items = base
  if (game.filter?.types)
    items = patchTypes(items, LegacyTypeMap[game.filter.types])
  if (game.patched) items = patchPokemon(items, pokemon, fakemon)

  return new Response(JSON.stringify(items), {
    headers: {
      'Cache-Control': 's-maxage=1, stale-while-revalidate',
      'Content-Type': 'application/json'
    }
  })
}
