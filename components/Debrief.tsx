'use client';
import { useState } from 'react';
import { MathMd, Md } from './Markdown';
import { api } from '@/lib/client';
import { track } from '@/lib/track';
import { level } from '@/lib/scoring';
import type { CrowdHistogram, DebriefEntry } from '@/lib/types';
import { TIER_COLOR, TIER_NAME } from '@/lib/types';

function Legend() {
  const item = (c: string, t: string) => (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2" style={{ background: c }} />
      {t}
    </div>
  );
  return (
    <div className="flex gap-3 text-[18px] leading-none text-haze" aria-hidden="true">
      {item('var(--signal)', 'Answer')}
      {item('var(--you-text)', 'You')}
      {item('var(--flare)', 'Trap')}
    </div>
  );
}

/** Crowd histogram of today's guesses (25 buckets), answer, you and trap marked. */
export function CrowdStrip({ crowd, answer }: { crowd: CrowdHistogram; answer: string }) {
  const max = Math.max(1, ...crowd.counts);
  const total = crowd.counts.reduce((a, b) => a + b, 0);
  const peak = crowd.counts.indexOf(max);
  const aria = `Histogram of ${total} guesses on a ${crowd.scale} scale from ${crowd.axis.min} to ${crowd.axis.max}. The answer, ${answer}, is in column ${crowd.answerBucket + 1} of 25; the trap is in column ${crowd.trapBucket + 1}${crowd.youBucket !== null ? `; you are in column ${crowd.youBucket + 1}` : ''}. The most common column is ${peak + 1}.`;
  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label={aria} className="flex h-[72px] items-end gap-[2px] md:h-20" style={{ borderBottom: '2px solid var(--line)' }}>
        {crowd.counts.map((n, i) => {
          const bg = i === crowd.youBucket ? 'var(--you-text)' : i === crowd.answerBucket ? 'var(--signal)' : i === crowd.trapBucket ? 'var(--flare)' : 'var(--divider)';
          const h = n === 0 ? (i === crowd.answerBucket || i === crowd.trapBucket || i === crowd.youBucket ? 4 : 0) : Math.max(4, Math.round((n / max) * 18) * 4);
          return <div key={i} className="min-w-0 flex-1 basis-0" style={{ height: Math.min(h, 72), background: bg }} />;
        })}
      </div>
      <div className="flex justify-between text-[18px] leading-none text-haze" aria-hidden="true">
        <span>{crowd.axis.min}</span>
        <span>{crowd.axis.mid}</span>
        <span>{crowd.axis.max}</span>
      </div>
      <Legend />
    </div>
  );
}

/** Top word answers with their share of players. */
export function TopAnswers({ items }: { items: NonNullable<DebriefEntry['topAnswers']> }) {
  if (!items.length) return <p className="m-0 text-[20px] text-haze">No answers yet.</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Top answers today">
      {items.map((t) => {
        const bg = t.isCorrect ? 'var(--signal)' : t.isTrap ? 'var(--flare)' : 'var(--divider)';
        const pct = Math.round(t.share * 100);
        return (
          <li key={t.text} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2 text-[18px] leading-none">
              <span>
                {t.text}
                {t.isYou ? <span className="text-you"> (you)</span> : null}
                <span className="sr-only">{t.isCorrect ? ', correct' : t.isTrap ? ', the trap' : ', wrong'}</span>
              </span>
              <span className="text-haze">{pct}%</span>
            </div>
            <div className="h-2 bg-rule">
              <div className="h-2" style={{ width: `${Math.max(2, pct)}%`, background: t.isYou ? 'var(--you-text)' : bg }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DebriefCard({ d, coldStart }: { d: DebriefEntry; coldStart: boolean }) {
  const [math, setMath] = useState(false);
  const [reported, setReported] = useState(d.reported);
  const [reporting, setReporting] = useState(false);

  const report = async () => {
    setReporting(true);
    try {
      await api('/api/report', { slot: d.slot });
      setReported(true);
      track('verdict_reported', { slot: d.slot });
    } finally {
      setReporting(false);
    }
  };

  return (
    <article className="card flex flex-col gap-4 p-5 md:p-6" aria-labelledby={`debrief-${d.slot}`}>
      <div className="flex items-center gap-3">
        <h3 id={`debrief-${d.slot}`} className="eyebrow m-0 font-normal">Riddle {d.slot} · {TIER_NAME[d.tier]}</h3>
        <div className="h-[6px] w-[6px]" style={{ background: TIER_COLOR[d.tier] }} aria-hidden="true" />
      </div>
      <div className="panel-title text-[24px] leading-[1.2]">{d.promptShort}</div>
      <div className="flex flex-col gap-2 text-[20px] leading-none">
        <div>
          You: <span className="result-color" style={{ ['--lvl' as string]: `var(--lvl-${level(d.closeness).toLowerCase()})` }}>{d.yourAnswer}</span>
          {d.trapped && <span className="text-flare-text"> (trap)</span>}
        </div>
        <div>
          Answer: <span className="text-signal-text">{d.answerDisplay}</span>
        </div>
      </div>

      {coldStart ? (
        <p className="m-0 text-[18px] leading-[1.3] text-haze">How everyone else answered appears once 30 people have played.</p>
      ) : (
        <>
          {d.crowd && <CrowdStrip crowd={d.crowd} answer={d.answerDisplay} />}
          {d.topAnswers && <TopAnswers items={d.topAnswers} />}
          {d.trapRate !== null && (
            <div className="text-[18px] leading-none text-flare-text">{Math.round(d.trapRate * 100)}% of players fell for the trap.</div>
          )}
        </>
      )}

      <div className="dash-top flex flex-col gap-2 pt-3">
        <div className="text-[18px] leading-none text-haze">Why</div>
        <Md className="text-[20px] leading-[1.3]">{d.explainIntuitionMd}</Md>
        <button
          type="button"
          className="link-button self-start text-[18px] text-haze"
          style={{ minHeight: 32 }}
          aria-expanded={math}
          aria-controls={`math-${d.slot}`}
          onClick={() => {
            if (!math) track('math_expanded', { slot: d.slot });
            setMath(!math);
          }}
        >
          {math ? 'Hide the math' : 'Show the math'}
        </button>
        {math && (
          <div id={`math-${d.slot}`} className="text-[19px] leading-[1.3]">
            <MathMd>{d.explainMathMd}</MathMd>
          </div>
        )}
        {d.canReport &&
          (reported ? (
            <p className="m-0 text-[18px] text-haze">Thanks. We&apos;ll take another look at that verdict.</p>
          ) : (
            <button type="button" className="link-button self-start text-[18px] text-haze" style={{ minHeight: 32 }} onClick={() => void report()} disabled={reporting}>
              Think your answer should count? Report it
            </button>
          ))}
      </div>
    </article>
  );
}
