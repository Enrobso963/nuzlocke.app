<script>
  import { resolvePokemonIconName } from '$lib/utils/pokemon-evolved'

  export let name = 'unknown-pokemon2',
    className = '',
    type = 'm'

  $: iconName = type === 'm' ? resolvePokemonIconName(name) : name
</script>

<span class="pk{type}-wrapper {$$restProps.class || ''} {className}">
  <i
    class:pkm-sevii={iconName?.includes('sevii')}
    class:pkm-hoennian={iconName?.includes('-hoenn')}
    class="pk{type} pk{type}-{iconName}"
  />
  <slot />
</span>
