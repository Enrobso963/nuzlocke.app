import BasePokemon from '../../../../api/pokemon.json/_pokemon.json'
import patches from '$lib/data/patches.json'

const pokemon = import.meta.glob(
  [
    '/node_modules/pokemon-sprites/sprites/pokemon/*.png',
    '/node_modules/pokemon-sprites/sprites/pokemon/shiny/*.png'
  ],
  {
    query: '?base64',
    import: 'default'
  }
)

const customSprites = import.meta.glob(['/sprites/*.png'], {
  query: '?base64',
  import: 'default'
})

const normalise = (value = '') =>
  decodeURIComponent(`${value}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const baseAliasToId = BasePokemon.reduce((acc, pokemon) => {
  const id = `${pokemon.imgId || pokemon.num || ''}`
  if (!id) return acc

  for (const key of [pokemon.alias, pokemon.name, pokemon.sprite]) {
    acc[normalise(key)] = id
  }

  return acc
}, {})

const PokemonEvolvedLegacySprites = {
  missingnoform1: '350',
  missingnoform2: '351',
  missingnoform3: '352',
  missingnoform4: '353',
  missingnoform5: '354'
}

const customAliasToId = Object.values(patches['pokemon-evolved']?.fakemon || {}).reduce(
  (acc, pokemon) => {
    const id = `${pokemon.imgId || pokemon.num || ''}`
    if (!id) return acc

    for (const key of [pokemon.alias, pokemon.name, pokemon.label, pokemon.sprite]) {
      acc[normalise(key)] = id
    }

    return acc
  },
  { ...PokemonEvolvedLegacySprites }
)

const { byId: customById, byName: customByName } = Object.entries(customSprites).reduce(
  (acc, [path, loader]) => {
    const match = /front_(\d+)_(.+)\.png$/i.exec(path)
    if (!match) return acc

    const [, id, name] = match
    acc.byId[id] = loader
    acc.byName[normalise(name)] = loader
    return acc
  },
  { byId: {}, byName: {} }
)

const packageSprite = async (spriteName, shiny) => {
  const packagePath = shiny
    ? `/node_modules/pokemon-sprites/sprites/pokemon/shiny/${spriteName}.png`
    : `/node_modules/pokemon-sprites/sprites/pokemon/${spriteName}.png`
  const sprite = pokemon[packagePath]
  if (!sprite) return null
  return await sprite()
}

const customSprite = async (spriteName) => {
  const key = normalise(spriteName)
  const sprite =
    customByName[key] ||
    customById[customAliasToId[key]] ||
    customById[key]

  if (!sprite) return null
  return await sprite()
}

const keyToBase64 = async (spriteName, shiny) => {
  const custom = !shiny ? await customSprite(spriteName) : null
  if (custom) return custom

  const direct = await packageSprite(spriteName, shiny)
  if (direct) return direct

  const baseId = baseAliasToId[normalise(spriteName)]
  if (baseId) return await packageSprite(baseId, shiny)

  return null
}

export async function GET({ params }) {
  const { id, variant } = params
  const shiny = variant === 'shiny'
  const sprite = await keyToBase64(id, shiny)

  if (!sprite) return new Response('', { status: 404 })

  return new Response(Buffer.from(sprite, 'base64'), {
    headers: {
      'Content-Type': 'image/png'
    }
  })
}
