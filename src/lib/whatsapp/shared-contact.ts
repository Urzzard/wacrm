/**
 * Inbox text for an inbound `contacts` message — a contact card the
 * customer shared.
 *
 * Two very different things arrive in this shape:
 *   - the customer tapped "Share contact info" on a request_contact_info
 *     message we sent: `origin: "contact_request"`, and the card is
 *     their own number (`phones[].wa_id` equals the sender's `from`);
 *   - the customer attached someone else's card from their address book
 *     (`origin: "other"`).
 *
 * The agent must be able to tell them apart at a glance — the second is
 * not the customer's number — so the two render differently. Without
 * this the message landed as "[Unsupported message type: contacts]".
 */

export interface WaSharedContact {
  name?: { formatted_name?: string; first_name?: string; last_name?: string }
  phones?: { phone?: string; wa_id?: string; type?: string }[]
  origin?: string
}

function digits(value: string | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

function displayPhone(phone: { phone?: string; wa_id?: string }): string {
  if (phone.phone?.trim()) return phone.phone.trim()
  return phone.wa_id ? `+${phone.wa_id}` : ''
}

function displayName(contact: WaSharedContact): string {
  const n = contact.name
  if (!n) return ''
  return (
    n.formatted_name?.trim() ||
    [n.first_name, n.last_name].filter(Boolean).join(' ').trim()
  )
}

/** True when the card is the sender's own number, shared on request. */
export function isOwnNumberShare(
  contact: WaSharedContact,
  senderPhone: string | undefined
): boolean {
  const from = digits(senderPhone)
  return (
    contact.origin === 'contact_request' &&
    !!from &&
    (contact.phones ?? []).some((p) => digits(p.wa_id) === from)
  )
}

export function sharedContactsText(
  contacts: WaSharedContact[] | undefined,
  senderPhone: string | undefined
): string {
  const cards = contacts ?? []
  if (cards.length === 0) return '📇 [Contacto compartido]'

  return cards
    .map((contact) => {
      const phones = (contact.phones ?? []).map(displayPhone).filter(Boolean)
      if (isOwnNumberShare(contact, senderPhone)) {
        const own = (contact.phones ?? []).find(
          (p) => digits(p.wa_id) === digits(senderPhone)
        )
        return `📇 Compartió su número: ${own ? displayPhone(own) : phones[0]}`
      }
      const parts = [displayName(contact), ...phones].filter(Boolean)
      return `📇 Compartió un contacto: ${parts.join(', ') || 'sin datos'}`
    })
    .join('\n')
}
