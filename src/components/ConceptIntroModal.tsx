import { ArrowRight, Sparkles, X } from 'lucide-react';
import { ChapterData } from '../game/types';

interface ConceptIntroModalProps {
  chapter: ChapterData;
  onStartChapter: () => void;
  onClose?: () => void;
  buttonLabel?: string;
}

function ConceptDiagram({ type }: { type: ChapterData['conceptDiagramType'] }) {
  switch (type) {
    case 'sequence':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <rect x="10" y="28" width="84" height="52" rx="12" fill="#0284C7" />
          <text x="52" y="59" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">1. 앞으로</text>
          <path d="M98 54 L116 54" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
          <polygon points="116,47 126,54 116,61" fill="#94A3B8" />
          <rect x="128" y="28" width="84" height="52" rx="12" fill="#0891B2" />
          <text x="170" y="59" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">2. 보석 줍기</text>
          <path d="M216 54 L234 54" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
          <polygon points="234,47 244,54 234,61" fill="#94A3B8" />
          <rect x="246" y="28" width="64" height="52" rx="12" fill="#10B981" />
          <text x="278" y="59" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="800">🏁 도착!</text>
        </svg>
      );
    case 'loop':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <rect x="12" y="16" width="110" height="78" rx="12" fill="#334155" />
          <text x="67" y="40" textAnchor="middle" fill="#CBD5E1" fontSize="12">앞으로 × 4줄</text>
          <text x="67" y="60" textAnchor="middle" fill="#94A3B8" fontSize="11">⬆️ ⬆️ ⬆️ ⬆️</text>
          <text x="67" y="80" textAnchor="middle" fill="#FCA5A5" fontSize="11">너무 길어요!</text>
          <path d="M132 55 L158 55" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
          <polygon points="158,48 170,55 158,62" fill="#F59E0B" />
          <rect x="178" y="16" width="130" height="78" rx="14" fill="#D97706" />
          <text x="243" y="42" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">🔁 4번 반복하기</text>
          <rect x="196" y="52" width="96" height="30" rx="8" fill="#0284C7" />
          <text x="244" y="72" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">⬆️ 앞으로 가기</text>
        </svg>
      );
    case 'debug':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <rect x="16" y="20" width="118" height="70" rx="12" fill="#7F1D1D" stroke="#F87171" strokeWidth="2" />
          <text x="75" y="47" textAnchor="middle" fill="#FECACA" fontSize="13" fontWeight="700">🐛 버그 발견!</text>
          <text x="75" y="70" textAnchor="middle" fill="#fff" fontSize="12">↪️ 오른쪽 돌기 (X)</text>
          <path d="M142 55 L170 55" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round" />
          <polygon points="170,48 182,55 170,62" fill="#A78BFA" />
          <rect x="190" y="20" width="114" height="70" rx="12" fill="#065F46" stroke="#34D399" strokeWidth="2" />
          <text x="247" y="47" textAnchor="middle" fill="#A7F3D0" fontSize="13" fontWeight="700">🔧 수리 완료!</text>
          <text x="247" y="70" textAnchor="middle" fill="#fff" fontSize="12">↩️ 왼쪽 돌기 (O)</text>
        </svg>
      );
    case 'condition':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <polygon points="160,10 225,52 160,94 95,52" fill="#059669" />
          <text x="160" y="56" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">앞에 벽?</text>
          <path d="M95 52 L58 52" stroke="#34D399" strokeWidth="3" />
          <rect x="8" y="34" width="52" height="36" rx="8" fill="#4F46E5" />
          <text x="34" y="56" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">예: 돌기</text>
          <path d="M225 52 L262 52" stroke="#38BDF8" strokeWidth="3" />
          <rect x="260" y="34" width="54" height="36" rx="8" fill="#0284C7" />
          <text x="287" y="56" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">아니오: 앞</text>
        </svg>
      );
    case 'while':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <rect x="18" y="18" width="175" height="74" rx="14" fill="#EA580C" />
          <text x="105" y="44" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">🏁 깃발까지 계속 반복</text>
          <rect x="34" y="54" width="142" height="28" rx="8" fill="#0F172A" />
          <text x="105" y="72" textAnchor="middle" fill="#FDE047" fontSize="12" fontWeight="700">벽 피하고 보석 줍기!</text>
          <path d="M198 55 L226 55" stroke="#FB923C" strokeWidth="4" />
          <polygon points="226,48 238,55 226,62" fill="#FB923C" />
          <rect x="242" y="28" width="66" height="54" rx="12" fill="#10B981" />
          <text x="275" y="60" textAnchor="middle" fill="#0F172A" fontSize="13" fontWeight="800">딱 멈춤!</text>
        </svg>
      );
    case 'function':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <rect x="12" y="14" width="145" height="82" rx="14" fill="#7E22CE" />
          <text x="84" y="38" textAnchor="middle" fill="#F3E8FF" fontSize="13" fontWeight="700">🧩 내 명령 (계단)</text>
          <text x="84" y="60" textAnchor="middle" fill="#fff" fontSize="11">앞 → 왼 → 앞 → 줍기 → 오</text>
          <text x="84" y="80" textAnchor="middle" fill="#E9D5FF" fontSize="11">한 번만 만들어 두면!</text>
          <path d="M164 55 L192 55" stroke="#C084FC" strokeWidth="4" />
          <polygon points="192,48 204,55 192,62" fill="#C084FC" />
          <rect x="208" y="20" width="100" height="70" rx="12" fill="#1E293B" stroke="#A855F7" strokeWidth="2" />
          <text x="258" y="48" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">🔁 3번 반복</text>
          <text x="258" y="72" textAnchor="middle" fill="#D8B4FE" fontSize="12" fontWeight="700">🧩 내 명령 실행</text>
        </svg>
      );
    case 'variable':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <rect x="18" y="22" width="90" height="66" rx="12" fill="#BE123C" />
          <text x="63" y="47" textAnchor="middle" fill="#FFE4E6" fontSize="12" fontWeight="700">🔑 열쇠 상자</text>
          <text x="63" y="74" textAnchor="middle" fill="#FDE047" fontSize="22" fontWeight="800">2 + 3</text>
          <path d="M116 55 L144 55" stroke="#F43F5E" strokeWidth="4" />
          <polygon points="144,48 156,55 144,62" fill="#F43F5E" />
          <rect x="160" y="22" width="60" height="66" rx="12" fill="#0F172A" stroke="#FB7185" strokeWidth="2" />
          <text x="190" y="63" textAnchor="middle" fill="#FDE047" fontSize="24" fontWeight="800">5</text>
          <path d="M226 55 L246 55" stroke="#34D399" strokeWidth="4" />
          <rect x="248" y="22" width="60" height="66" rx="12" fill="#065F46" />
          <text x="278" y="52" textAnchor="middle" fill="#fff" fontSize="18">🔓</text>
          <text x="278" y="74" textAnchor="middle" fill="#A7F3D0" fontSize="12" fontWeight="700">5번 문!</text>
        </svg>
      );
    case 'python':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28" aria-hidden="true">
          <rect x="12" y="18" width="118" height="74" rx="12" fill="#D97706" />
          <text x="71" y="45" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">🔁 3번 반복</text>
          <text x="71" y="70" textAnchor="middle" fill="#FEF3C7" fontSize="12">⬆️ 앞으로 가기</text>
          <path d="M138 55 L164 55" stroke="#38BDF8" strokeWidth="4" />
          <polygon points="164,48 176,55 164,62" fill="#38BDF8" />
          <rect x="180" y="18" width="128" height="74" rx="12" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
          <text x="194" y="46" fill="#7DD3FC" fontSize="12" fontFamily="monospace" fontWeight="700">for i in range(3):</text>
          <text x="208" y="70" fill="#4ADE80" fontSize="12" fontFamily="monospace" fontWeight="700">forward()</text>
        </svg>
      );
  }
}

export function ConceptIntroModal({
  chapter,
  onStartChapter,
  onClose,
  buttonLabel = '단계 시작하기',
}: ConceptIntroModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/88 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Accent Banner */}
        <div
          className="px-6 py-5 flex items-center justify-between border-b border-slate-800"
          style={{ backgroundColor: `${chapter.accentColor}22` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{chapter.badgeEmoji}</span>
            <div>
              <p className="text-xs font-bold text-slate-300">
                30초 코딩 개념 · {chapter.themeName}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-white">
                {chapter.title}
              </h2>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto code-scroll">
          {/* Diagram */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <ConceptDiagram type={chapter.conceptDiagramType} />
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-lg font-extrabold text-amber-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {chapter.conceptTitle}
            </h3>
            <p className="text-base text-slate-100 leading-relaxed">
              {chapter.conceptSummary}
            </p>
          </div>

          {/* Bullets */}
          <ul className="space-y-2 text-sm sm:text-base text-slate-200">
            {chapter.conceptBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="font-extrabold text-emerald-400 shrink-0">{i + 1}.</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* Mini Example */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-400 mb-2">
              {chapter.conceptExampleTitle}
            </div>
            <div className="space-y-1.5 font-code text-sm text-sky-200">
              {chapter.conceptExampleBlocks.map((line, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onStartChapter}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg transition-colors cursor-pointer"
          >
            {buttonLabel}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
