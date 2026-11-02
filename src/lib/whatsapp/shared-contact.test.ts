import { describe, expect, it } from 'vitest'

import { isOwnNumberShare, sharedContactsText } from './shared-contact'

// Shapes taken from real webhooks (numbers shortened).
const OWN = {
  name: { first_name: 'Bryan', last_name: 'Suarez', formatted_name: 'Bryan Suarez' },
  phones: [{ phone: '+51 960 111 174', wa_id: '51960111174', type: 'CELULAR' }],
  origin: 'contact_request',
}

const OTHER = {
  name: { formatted_name: 'Carlos Cueva' },
  phones: [{ phone: '+51 957 222 261', wa_id: '51957222261' }],
  origin: 'other',
}

describe('sharedContactsText', () => {
  it('labels a requested card with the sender’s own number', () => {
    expect(sharedContactsText([OWN], '51960111174')).toBe(
      '📇 Compartió su número: +51 960 111 174'
    )
  })

  it('labels someone else’s card so it is not taken for the sender’s', () => {
    expect(sharedContactsText([OTHER], '51954333377')).toBe(
      '📇 Compartió un contacto: Carlos Cueva, +51 957 222 261'
    )
  })

  it('treats a contact_request card for another number as someone else’s', () => {
    expect(
      sharedContactsText([{ ...OWN, phones: [{ wa_id: '51999000000' }] }], '51960111174')
    ).toBe('📇 Compartió un contacto: Bryan Suarez, +51999000000')
  })

  it('renders one line per card and survives an empty payload', () => {
    expect(sharedContactsText([OTHER, OTHER], undefined).split('\n')).toHaveLength(2)
    expect(sharedContactsText(undefined, '51960111174')).toBe('📇 [Contacto compartido]')
    expect(sharedContactsText([{}], undefined)).toBe('📇 Compartió un contacto: sin datos')
  })
})

describe('isOwnNumberShare', () => {
  it('needs both origin contact_request and wa_id == from', () => {
    expect(isOwnNumberShare(OWN, '51960111174')).toBe(true)
    expect(isOwnNumberShare({ ...OWN, origin: 'other' }, '51960111174')).toBe(false)
    expect(isOwnNumberShare(OWN, '51954333377')).toBe(false)
    expect(isOwnNumberShare(OWN, undefined)).toBe(false)
  })
})
