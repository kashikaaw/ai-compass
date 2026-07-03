/**
 * chatHistoryParser.test.ts
 * -----------------------------------------------------------------------------
 * Lightweight fixture-based checks for the export parsers. The project has no
 * test runner, so this is a self-contained script: run it with
 *
 *   npx tsx src/lib/chatHistoryParser.test.ts
 *
 * It exits non-zero on the first failed assertion. Fixtures are hand-built
 * minimal objects shaped like the documented ChatGPT/Claude export formats.
 */
import {
  parseChatHistory,
  detectSource,
  parseChatGPT,
  parseClaude,
} from './chatHistoryParser'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ok  — ${msg}`)
  } else {
    failures++
    console.error(`FAIL — ${msg}`)
  }
}

/* ------------------------------- ChatGPT ---------------------------------- */

const chatgptFixture = [
  {
    title: 'Detective book',
    mapping: {
      root: { id: 'root', message: null, parent: null, children: ['a'] },
      a: {
        id: 'a',
        parent: 'root',
        children: ['b'],
        message: {
          author: { role: 'user' },
          create_time: 1_700_000_000,
          content: { content_type: 'text', parts: ['Write me a book about a detective.'] },
        },
      },
      b: {
        id: 'b',
        parent: 'a',
        children: [],
        message: {
          author: { role: 'assistant' },
          content: { content_type: 'text', parts: ['Sure, here is a draft.'] },
        },
      },
      c: {
        id: 'c',
        parent: 'a',
        children: [],
        message: {
          author: { role: 'user' },
          // parts as objects rather than strings — must still be extracted
          content: { parts: [{ content_type: 'text', text: 'Make it noir.' }] },
        },
      },
    },
  },
]

console.log('ChatGPT export:')
assert(detectSource(chatgptFixture) === 'chatgpt', 'detects chatgpt by `mapping` key')
{
  const p = parseChatGPT(chatgptFixture)
  assert(p.length === 2, 'extracts both user messages (string + object parts)')
  assert(
    p.some((x) => x.text === 'Write me a book about a detective.'),
    'extracts string-part user prompt',
  )
  assert(p.some((x) => x.text === 'Make it noir.'), 'extracts object-part user prompt')
  assert(
    !p.some((x) => x.text.includes('here is a draft')),
    'ignores assistant messages',
  )
}

/* -------------------------------- Claude ---------------------------------- */

const claudeFixture = [
  {
    uuid: 'conv-1',
    name: 'Trip planning',
    created_at: '2026-01-02T10:00:00Z',
    // key name variant: chat_messages, sender/text
    chat_messages: [
      { sender: 'human', text: 'Plan a 3-day trip to Kyoto.', created_at: '2026-01-02T10:00:00Z' },
      { sender: 'assistant', text: 'Here is a plan…' },
    ],
  },
  {
    id: 'conv-2',
    // key name variant: messages, role/content-array
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'Summarize this article.' }] },
      { role: 'model', content: 'A summary.' },
    ],
  },
]

console.log('Claude export:')
assert(detectSource(claudeFixture) === 'claude', 'detects claude by `messages`/`chat_messages`')
{
  const p = parseClaude(claudeFixture)
  assert(p.length === 2, 'extracts both human/user messages across key-name variants')
  assert(p.some((x) => x.text === 'Plan a 3-day trip to Kyoto.'), 'extracts sender/text human message')
  assert(p.some((x) => x.text === 'Summarize this article.'), 'extracts role/content-array user message')
  assert(!p.some((x) => x.text.includes('summary')), 'ignores assistant/model messages')
}

/* ------------------------- malformed / empty ------------------------------ */

console.log('Malformed / empty handling:')
assert(parseChatHistory('not json at all {').error !== undefined, 'invalid JSON returns error, no throw')
assert(parseChatHistory('[]').error !== undefined, 'empty array returns a clear error')
assert(parseChatHistory('{"foo":1}').source === 'unknown', 'unrecognized shape -> unknown source')
assert(parseChatHistory('null').error !== undefined, 'null returns error, no throw')
{
  const r = parseChatHistory(JSON.stringify(chatgptFixture))
  assert(r.source === 'chatgpt' && r.prompts.length === 2 && !r.error, 'end-to-end chatgpt parse')
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`)
  process.exit(1)
} else {
  console.log('\nAll parser checks passed.')
}
