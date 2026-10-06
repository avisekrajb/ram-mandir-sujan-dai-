import React, { useMemo, useState } from 'react';
import { Check, Copy, Eraser, Info, Repeat2 } from 'lucide-react';
import {
  preetiToUnicode,
  unicodeToPreeti,
  romanToDevanagari,
  romanToTamil,
  englishToChinese,
} from '../../utils/unicodeConvert';
import { chipClass, fill, loadStored, storeValue, useCopy } from './toolsShared';
import { localDigits } from '../../utils/nepaliCalendar';

// What each mode does with the text, and the language tag to put on the result.
const MODES = [
  { id: 'en-ne', label: 'English → नेपाली', from: 'en', to: 'ne', run: romanToDevanagari, outLang: 'ne', guide: ['roman'] },
  { id: 'en-preeti', label: 'English → Preeti', from: 'en', to: 'preeti', run: (s) => unicodeToPreeti(romanToDevanagari(s)), outLang: 'en', guide: ['roman', 'preetiOut'] },
  { id: 'preeti-ne', label: 'Preeti → Unicode', from: 'preeti', to: 'ne', run: preetiToUnicode, outLang: 'ne', guide: ['preetiIn'] },
  { id: 'ne-preeti', label: 'Unicode → Preeti', from: 'ne', to: 'preeti', run: unicodeToPreeti, outLang: 'en', guide: ['preetiOut'] },
  { id: 'en-hi', label: 'English → हिन्दी', from: 'en', to: 'hi', run: romanToDevanagari, outLang: 'hi', guide: ['roman'] },
  { id: 'en-ta', label: 'English → தமிழ்', from: 'en', to: 'ta', run: romanToTamil, outLang: 'ta', guide: ['ta'] },
  { id: 'en-zh', label: 'English → 中文', from: 'en', to: 'zh', run: englishToChinese, outLang: 'zh', guide: ['zh'] },
];

const GUIDES = {
  roman: ['tb_guideRoman', 'Type the way it sounds: namaste → नमस्ते. Double a vowel for the long sound: kaam = काम, tiin or teen = तीन, puujaa or poojaa = पूजा. A capital letter inside a word gives the hard sounds (T Th D Dh N Sh): kaaThamaaNDau = काठमाण्डौ. M gives the anusvara (saMsaar = संसार), H the visarga (duHkha = दुःख) and RRi the vowel ऋ (kRRiShNa = कृष्ण).'],
  preetiOut: ['tb_guidePreetiOut', 'Preeti text only reads correctly in a Preeti font. Paste it into a document that uses one.'],
  preetiIn: ['tb_guidePreetiIn', 'Paste text typed in the Preeti font (it looks like g]kfn) to get readable Nepali.'],
  ta: ['tb_guideTa', 'A sounds-like Tamil spelling. Please check names before you use them.'],
  zh: ['tb_guideZh', 'Only common temple and greeting words are translated; other words stay in English.'],
};

const AREA = 'w-full resize-y rounded-2xl border p-4 text-base leading-relaxed text-ink focus:outline-none focus:ring-4 focus:ring-vermilion/15 sm:p-5';

/** Text converter: roman typing to Nepali, Hindi, Tamil or Chinese, and Preeti to and from Unicode. */
export default function TextConverter({ t, lang }) {
  const [mode, setMode] = useState(() => {
    const saved = loadStored('uc_text_mode', 'en-ne');
    return MODES.some((m) => m.id === saved) ? saved : 'en-ne';
  });
  const [input, setInput] = useState(() => String(loadStored('uc_text_input', '')));
  const [copied, copy] = useCopy(t);

  const active = MODES.find((m) => m.id === mode) || MODES[0];
  const output = useMemo(() => active.run(input || ''), [active, input]);

  const changeMode = (id) => { setMode(id); storeValue('uc_text_mode', id); };
  const changeInput = (value) => { setInput(value); storeValue('uc_text_input', value); };

  return (
    <div className="px-4 pb-6 pt-5 sm:px-10 sm:pb-10 sm:pt-8">
      <div role="group" aria-label={t.a5_toolText || 'Converter'} className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={m.id === mode} onClick={() => changeMode(m.id)} className={chipClass(m.id === mode)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-line bg-panel px-4 py-3">
        {active.guide.map((g) => (
          <p key={g} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft sm:text-base">
            <Info size={16} className="mt-1 shrink-0 text-vermilion" aria-hidden="true" />
            <span>{t[GUIDES[g][0]] || GUIDES[g][1]}</span>
          </p>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="tool-text-in" className="text-sm font-semibold text-ink-soft">{t.inputText || 'Input'}</label>
            <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs text-ink-soft">{active.from}</span>
          </div>
          <textarea
            id="tool-text-in"
            value={input}
            onChange={(e) => changeInput(e.target.value)}
            placeholder={t.typeHere || 'Type or paste text here...'}
            spellCheck={false}
            className={`${AREA} min-h-[13rem] border-line bg-white placeholder:text-mute focus:border-vermilion`}
          />
          <p className="mt-1.5 text-sm text-mute">{fill(t.tb_chars || '{n} characters', { n: localDigits(input.length, lang) })}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="tool-text-out" className="text-sm font-semibold text-ink-soft">{t.outputText || 'Output'}</label>
            <span className="rounded-md bg-vermilion px-2 py-0.5 font-mono text-xs text-white">{active.to}</span>
          </div>
          <textarea
            id="tool-text-out"
            readOnly
            value={output}
            lang={active.outLang}
            spellCheck={false}
            placeholder={t.outputHere || 'Converted text appears here...'}
            className={`${AREA} min-h-[13rem] border-line bg-panel placeholder:text-mute`}
          />
          <p className="mt-1.5 text-sm text-mute">{fill(t.tb_chars || '{n} characters', { n: localDigits(output.length, lang) })}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={() => copy(output)} disabled={!output} className="btn-primary px-5 disabled:cursor-not-allowed disabled:opacity-50">
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? (t.copied || 'Copied!') : (t.copy || 'Copy')}
        </button>
        <button type="button" onClick={() => changeInput(output)} disabled={!output} className="btn-outline disabled:cursor-not-allowed disabled:opacity-50">
          <Repeat2 size={16} aria-hidden="true" />
          {t.tb_useResult || 'Use result as input'}
        </button>
        <button type="button" onClick={() => changeInput('')} disabled={!input} className="btn-outline disabled:cursor-not-allowed disabled:opacity-50">
          <Eraser size={16} aria-hidden="true" />
          {t.tb_clear || 'Clear'}
        </button>
      </div>
    </div>
  );
}
