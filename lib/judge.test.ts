import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultJudge, JEV_MODEL, JEV_URL, jevJudge, jevRequest, judgeName, parseJevResponse, type JudgeInput } from './judge';

const input: JudgeInput = {
  prompt: "What has keys but can't open a single lock?",
  canonical: 'a piano',
  accepted: ['piano', 'keyboard'],
  traps: ['keychain'],
  playerAnswer: 'a <b>grand</b> `piano`',
};

const answer = (choice: string, confidence = 0.9) => ({
  model: 'jev-1.13.0',
  answers: { verdict: { type: 'choice', choice, confidence, probabilities: {} } },
  usage: { input_tokens: 300, output_tokens: 20 },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('jevRequest', () => {
  it('sends the riddle as structured state and one correct/trapped/wrong Choice', () => {
    const r = jevRequest(input, 'jev-1.13.0');
    expect(r.model).toBe('jev-1.13.0');
    expect(r.state).toMatchObject({ riddle: input.prompt, accepted_answers: ['piano', 'keyboard'], trap_answers: ['keychain'] });
    expect(r.state.player_answer).toBe('a  b grand /b   piano '); // tag and backtick breakouts neutralized
    expect(r.questions.verdict.type).toBe('choice');
    expect(Object.keys(r.questions.verdict.criteria)).toEqual(['correct', 'trapped', 'wrong']);
  });

  it('pins the model unless JEV_MODEL overrides it', () => {
    expect(jevRequest(input).model).toBe(JEV_MODEL);
    vi.stubEnv('JEV_MODEL', 'jev-latest');
    expect(jevRequest(input).model).toBe('jev-latest');
  });
});

describe('parseJevResponse', () => {
  it('returns the chosen verdict', () => {
    expect(parseJevResponse(answer('correct'))).toBe('correct');
    expect(parseJevResponse(answer('trapped'))).toBe('trapped');
    expect(parseJevResponse(answer('wrong'))).toBe('wrong');
  });

  it('throws on unsure or malformed answers, so the caller records "wrong", uncached', () => {
    expect(() => parseJevResponse(answer('correct', 0.3))).toThrow(/low confidence/);
    expect(() => parseJevResponse(answer('maybe'))).toThrow(/malformed/);
    expect(() => parseJevResponse({ answers: {} })).toThrow(/malformed/);
    expect(() => parseJevResponse(null)).toThrow(/malformed/);
    expect(() => parseJevResponse({ answers: { verdict: { type: 'choice', choice: 'correct' } } })).toThrow(/low confidence/);
  });
});

describe('jevJudge', () => {
  it('posts to /v1/systemone with the bearer key', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(answer('correct')), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(jevJudge(input)).resolves.toBe('correct');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(JEV_URL);
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body).questions.verdict.type).toBe('choice');
  });

  it('throws on HTTP errors and when no key is set', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 429 })));
    await expect(jevJudge(input)).rejects.toThrow(/HTTP 429/);
    vi.stubEnv('TYPESAFE_API_KEY', '');
    await expect(jevJudge(input)).rejects.toThrow(/TYPESAFE_API_KEY/);
  });
});

describe('provider choice', () => {
  it('prefers Jev, then Claude, then none', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(judgeName()).toBeNull();
    await expect(defaultJudge(input)).rejects.toThrow();
    vi.stubEnv('ANTHROPIC_API_KEY', 'x');
    expect(judgeName()).toBe('claude-haiku-4-5');
    vi.stubEnv('TYPESAFE_API_KEY', 'y');
    expect(judgeName()).toBe(JEV_MODEL);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(answer('trapped')), { status: 200 })));
    await expect(defaultJudge(input)).resolves.toBe('trapped');
  });
});
