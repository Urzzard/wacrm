import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { resolveConversationByWaUserId } from './resolve-conversation';
import { SendMessageError } from './send-message';

const BSUID = 'PE.2160000000000000';

interface Script {
  contacts: { id: string }[];
  conversations: { id: string }[];
  inserts: string[];
  filters: [string, string, unknown][];
}

// Chainable stub: `.limit()` terminates the contact / conversation
// lookups, `.maybeSingle()` the audit-user lookup, `.single()` inserts.
function makeDb(script: Script): SupabaseClient {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {
        select: () => b,
        insert: () => {
          script.inserts.push(table);
          return b;
        },
        eq: (col: string, val: unknown) => {
          script.filters.push([table, col, val]);
          return b;
        },
        order: () => b,
        limit: () =>
          Promise.resolve({
            data: table === 'contacts' ? script.contacts : script.conversations,
            error: null,
          }),
        maybeSingle: () =>
          Promise.resolve({ data: { user_id: 'owner-1' }, error: null }),
        single: () => Promise.resolve({ data: { id: 'conv-new' }, error: null }),
      };
      return b;
    },
  } as unknown as SupabaseClient;
}

function script(partial: Partial<Script>): Script {
  return { contacts: [], conversations: [], inserts: [], filters: [], ...partial };
}

describe('resolveConversationByWaUserId', () => {
  it('resolves the contact holding the BSUID and its conversation', async () => {
    const s = script({ contacts: [{ id: 'c1' }], conversations: [{ id: 'cv1' }] });
    const res = await resolveConversationByWaUserId(makeDb(s), 'acc-1', BSUID);

    expect(res).toEqual({
      conversationId: 'cv1',
      contactId: 'c1',
      contactCreated: false,
      conversationCreated: false,
    });
    expect(s.filters).toContainEqual(['contacts', 'account_id', 'acc-1']);
    expect(s.filters).toContainEqual(['contacts', 'wa_user_id', BSUID]);
    expect(s.inserts).toEqual([]);
  });

  it('opens a conversation for a known contact that has none', async () => {
    const s = script({ contacts: [{ id: 'c1' }] });
    const res = await resolveConversationByWaUserId(makeDb(s), 'acc-1', BSUID);

    expect(res.conversationId).toBe('conv-new');
    expect(res.conversationCreated).toBe(true);
    expect(s.inserts).toEqual(['conversations']);
  });

  it('404s on an unknown BSUID and creates nothing', async () => {
    const s = script({});
    const err = await resolveConversationByWaUserId(makeDb(s), 'acc-1', BSUID).catch(
      (e) => e
    );

    expect(err).toBeInstanceOf(SendMessageError);
    expect(err).toMatchObject({ code: 'not_found', status: 404 });
    expect(s.inserts).toEqual([]);
  });
});
