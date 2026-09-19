import { parseReceiveScope, parseReceiveTargetType, receivePath } from './receivePath'

describe('receivePath', () => {
  it('defaults to the whole wallet', () => {
    expect(receivePath()).toBe('/receive?scope=all')
  })

  it('names only the layer when no address is chosen yet', () => {
    expect(receivePath('platform', { type: 'shielded' })).toBe('/receive?scope=platform&type=shielded')
  })

  it('carries the chosen destination', () => {
    expect(receivePath('identity', { type: 'identity', value: 'id-1' }))
      .toBe('/receive?scope=identity&type=identity&value=id-1')
  })

  // An empty value would pin the screen to a destination that does not exist,
  // instead of letting it fall back to the first candidate.
  it('drops an empty value', () => {
    expect(receivePath('platform', { type: 'platformAddress', value: '' }))
      .toBe('/receive?scope=platform&type=platformAddress')
  })

  it('round-trips through the parsers', () => {
    const params = new URLSearchParams(receivePath('core', { type: 'core', value: 'yAddr' }).split('?')[1])

    expect(parseReceiveScope(params.get('scope'))).toBe('core')
    expect(parseReceiveTargetType(params.get('type'))).toBe('core')
    expect(params.get('value')).toBe('yAddr')
  })
})

describe('parseReceiveScope', () => {
  it.each(['core', 'platform', 'identity'])('keeps %s', (scope) => {
    expect(parseReceiveScope(scope)).toBe(scope)
  })

  it.each([null, '', 'tokens'])('falls back to all for %p', (value) => {
    expect(parseReceiveScope(value)).toBe('all')
  })
})

describe('parseReceiveTargetType', () => {
  it.each(['core', 'platformAddress', 'shielded', 'identity'])('keeps %s', (type) => {
    expect(parseReceiveTargetType(type)).toBe(type)
  })

  // An unknown type must not pin the screen: null lets the scope pick a default.
  it.each([null, '', 'platform'])('returns null for %p', (value) => {
    expect(parseReceiveTargetType(value)).toBeNull()
  })
})
