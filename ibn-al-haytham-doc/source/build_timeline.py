import json, glob, os, sys
from PIL import Image
sys.path.insert(0, '.')
from assets import ASSETS, FALLBACK

AV = {k for k in ASSETS if os.path.exists(f'build/img/{k}.jpg')}
DIM = {k: Image.open(f'build/img/{k}.jpg').size for k in AV}

def A(key):
    if key in AV: return key
    for f in FALLBACK.get(key, []):
        if f in AV: return f
    return None

# ---------------- narration lines ----------------
LINES = {}
for f in sorted(glob.glob('vo/lines2/*.mp3.json')):
    lid = os.path.basename(f)[:-9]
    d = json.load(open(f)); w = d['words']
    t0 = max(0.0, w[0]['t'] - 0.04); t1 = w[-1]['t'] + w[-1]['d'] + 0.10
    LINES[lid] = dict(text=d['text'], words=w, src=f[:-5], trim0=t0, dur=t1 - t0)

class Line:
    def __init__(self, lid, s):
        self.id, self.s = lid, s
        L = LINES[lid]; self.L = L; self.d = L['dur']; self.e = s + self.d
    def w(self, n):
        ws = self.L['words']; n = min(n, len(ws) - 1)
        return self.s + ws[n]['t'] - self.L['trim0']
    def we(self, n):
        ws = self.L['words']; n = min(n, len(ws) - 1)
        return self.s + ws[n]['t'] + ws[n]['d'] - self.L['trim0']

# ---------------- schedule ----------------
segs = json.load(open('segments.json'))
GAP = 0.22
EXTRA = {'s0_hook_02': .4, 's0_hook_06': .3, 's0_hook_07': .5, 's1_basra_08': .3, 's2_nile_06': .4, 's2_nile_10': .5,
         's2_nile_12': .3, 's3_madness_04': 1.0, 's3_madness_09': .4, 's3_madness_10': .8, 's3_madness_14': .8,
         's4_optics_00': .5, 's5_method_07': .5, 's5_method_08': .3, 's6_europe_03': .5, 's7_ending_04': .8, 's7_ending_07': .8}
t = 0.25
SCHED, CARDS = [], []
NUMS = {'s1_basra': '01', 's2_nile': '02', 's3_madness': '03', 's4_optics': '04', 's5_method': '05', 's6_europe': '06', 's7_ending': '07'}
for sg in segs:
    sid = sg['id']
    if sid == 's1_basra':
        CARDS.append(('title', t, t + 4.9)); t += 4.6
    if sg['chapter']:
        CARDS.append(('chapter', t, t + 3.3, NUMS[sid], sg['chapter'][0], sg['chapter'][1])); t += 3.0
    ids = sorted(k for k in LINES if k.startswith(sid + '_'))
    for lid in ids:
        if sid == 's8_cta': t += 0.6
        SCHED.append(Line(lid, t)); t += LINES[lid]['dur'] + GAP + EXTRA.get(lid, 0) * .55
    t += 0.2
END_CARD_S = SCHED[-1].s - 0.4
DURATION = SCHED[-1].e + 5.0
LN = {l.id: l for l in SCHED}

# ---------------- clip builders ----------------
BG, OV, FLASH = [], [], []   # bg: (start, spec) ; ov: full clips
def bg(at, typ, p, **kw): BG.append((at, dict(type=typ, p=p, **kw)))
def ov(s, e, typ, p, z=500, **kw): OV.append(dict(s=s, e=e, type=typ, p=p, z=z, **kw))

KB = {'in': dict(s0=1.0, s1=1.07), 'out': dict(s0=1.08, s1=1.0),
      'l': dict(s0=1.07, s1=1.07, x0=1.6, x1=-1.6), 'r': dict(s0=1.07, s1=1.07, x0=-1.6, x1=1.6),
      'u': dict(s0=1.07, s1=1.07, y0=1.6, y1=-1.6), 'd': dict(s0=1.07, s1=1.07, y0=-1.6, y1=1.6)}
def P(at, key, kb='in', cap=None, pos=None, size=None, rot=0):
    k = A(key)
    if not k: return
    fn, mode, _ = ASSETS[k]
    kbd = KB[kb] if isinstance(kb, str) else kb
    p = dict(src=f'img/{k}.jpg', kb=kbd)
    if mode == 'doc':
        w, h = DIM[k]; asp = w / h
        dh = min(min(1000, (size or 860) * 1.12), 1740 / asp)
        p.update(doc=1, dh=round(dh), rot=rot)
        if isinstance(kb, str): p['kb'] = {'in': dict(s0=.98, s1=1.04), 'out': dict(s0=1.05, s1=.99)}.get(kb, dict(s0=1.0, s1=1.04))
    if cap: p['cap'] = cap
    if pos: p['pos'] = pos
    bg(at, 'photo', p)
def KT(at, lines, align='center', rule=False, y=540, bg_='paper'):
    bg(at, 'ktext', dict(bg=bg_, align=align, rule=rule, y=y, lines=lines))
def ln(tx, at, c='w', sz=96, w=700, font=None, an='words'):
    d = dict(tx=tx, at=at, c=c, sz=sz, w=w, an=an)
    if font: d['font'] = font
    return d
def SUPER(s, e, a, b=None): ov(s, e, 'super', dict(a=a, b=b))
def LOWER(s, e, n, t_): ov(s, e, 'lower', dict(n=n, t=t_))

# ---------------- cue sheet ----------------
def rel(L, x): return x - L.s

def cues():
    H = [LN[f's0_hook_{i:02d}'] for i in range(7)]
    L = H[0]; P(0.0, 'haytham', dict(s0=1.45, s1=1.62, y0=16, y1=18), size=900)
    KT(L.w(2) - .05, [ln('تظاهرَ بالجنون', .05, c='r', sz=150, an='mask')])
    bg(L.w(4) - .05, 'stat', dict(v=10, u='سنوات', s='1011 — 1021', count=.7))
    L = H[1]; KT(L.s - .05, [ln('لم يكن مجنونًا', .05, sz=128, an='mask')])
    P(L.w(3) - .05, 'hakim_mosque', 'l'); P(L.w(6) - .05, 'dinar', dict(s0=1.0, s1=1.08), size=620); P(L.w(10) - .05, 'zuwayla', 'in')
    L = H[2]; P(L.s - .05, 'cairo_street', dict(s0=1.2, s1=1.3, x0=-3, x1=-1)); P(L.w(3) - .05, 'ayscough', 'r'); P(L.w(6) - .05, 'camera_box', 'in', size=760)
    L = H[3]; P(L.s - .05, 'kircher', 'in', size=880); FLASH.append(L.w(2) + .05); P(L.w(2) + .05, 'encyc_camera', 'in', size=860); P(L.w(6) - .05, 'haytham', dict(s0=1.0, s1=1.06), size=900)
    L = H[4]; P(L.s - .05, 'ptolemy', 'in', size=900); P(L.w(9) - .05, 'ptolemy_eng', 'out', size=900)
    KT(L.w(15) - .05, [ln('كانوا', .0, c='g', sz=80, w=600, an='mask'), ln('مخطئين', .12, c='r', sz=170, an='mask')])
    L = H[5]; P(L.s - .05, 'philae_frere', 'in'); P(L.w(4) - .05, 'elephantine', 'l'); P(L.w(6) - .05, 'nasser_sat', 'in'); SUPER(L.w(7), L.e + .5, 'بعد تسعة قرون', 'أسوان')
    L = H[6]; KT(L.s - .05, [ln('ليست أسطورة', .05, c='g', sz=84, w=600, an='mask')]); P(L.w(3) - .05, 'haytham', dict(s0=1.12, s1=1.0), size=900)
    C = [LN[f's1_basra_{i:02d}'] for i in range(9)]
    L = C[0]; bg(L.s, 'map', dict(hi=['Iraq'], tigris=1, cam=[[0, 2500, 1250, 1500], [3.5, 2580, 1330, 760]],
             cities=[dict(k='basra', t=.6, big=1, sz=1.2), dict(k='baghdad', t=1.4)], regions=[dict(tx='العراق', x=2480, y=1140, t=.8)]), fo=.6)
    L = C[1]; P(L.s, 'basra_port', 'l'); P(L.w(7) - .2, 'dhow', 'in')
    L = C[2]; P(L.s, 'idrisi', 'in', size=880); P(L.w(8) - .2, 'library', 'in', size=900)
    L = C[3]; P(L.s, 'haytham', dict(s0=1.02, s1=1.09, y0=1, y1=-1), size=900); LOWER(L.w(7), L.e + .8, 'أبو علي الحسن بن الحسن بن الهيثم', 'وُلد نحو 965م · البصرة')
    L = C[4]; P(L.s, 'almagest', 'in', size=860); P(L.w(9) - .2, 'abbasid_ms', 'r')
    L = C[5]; P(L.s, 'library', dict(s0=1.25, s1=1.38, y0=8, y1=6), size=900)
    KT(L.w(10) - .2, [ln('لا يقبل رأيًا', .2, sz=92, w=600), ln('لمجرّد أنّ قائله عظيم', .55, c='r', sz=108)])
    L = C[6]; KT(L.s - .1, [ln('طريقٌ واحد إلى الحقيقة', .3, c='g', sz=52, w=500), ln('الحواسّ', rel(L, L.w(8)), sz=150), ln('والعقل', rel(L, L.w(10)), c='r', sz=150)], rule=True)
    L = C[7]; P(L.s, 'ptolemy', 'in', size=900); SUPER(L.w(10), L.e + 1.2, '«بطليموس الثاني»', 'لقبٌ أُطلق عليه')
    L = C[8]; P(L.s, 'haytham', dict(s0=1.35, s1=1.6, y0=12, y1=16), size=900)
    ov(C[5].s, C[5].s + 5.0, 'subpill', dict(tx='قناة يونس'), z=700)

    N = [LN[f's2_nile_{i:02d}'] for i in range(13)]
    L = N[0]; P(L.s, 'library', dict(s0=1.0, s1=1.06), size=900)
    L = N[1]; bg(L.s - .3, 'quote', dict(text=L.L['text'].replace('...', '…'), attr='ابن الهيثم · كما نقله ابن القفطي', t0=.5, t1=L.d - .3, size=74))
    L = N[2]; bg(L.s, 'map', dict(hi=['Egypt'], nile=dict(t=.4, d=3.2), cam=[[0, 2150, 1420, 1100], [L.d, 2150, 1470, 950]],
             cities=[dict(k='cairo', t=1.2, side='r'), dict(k='aswan', t=2.6, side='r')], regions=[dict(tx='مصر', x=1960, y=1520, t=.6)]))
    L = N[3]; bg(L.s, 'map', dict(hi=['Iraq', 'Egypt'], tigris=1, nile=dict(t=0, d=.1), cam=[[0, 2380, 1330, 1300], [L.d, 2330, 1350, 1150]],
             routes=[dict(a='basra', b='cairo', t=.3, d=rel(L, L.w(3)) - .3, bend=.16)],
             cities=[dict(k='basra', t=0, big=1), dict(k='cairo', t=rel(L, L.w(3)), big=1, side='r')]))
    P(L.w(5), 'dinar', 'in', size=620); LOWER(L.w(8), L.e + 1.6, 'الحاكم بأمر الله', 'الخليفة الفاطمي · 996 – 1021م')
    L = N[4]; P(L.s, 'hakim_mosque', 'r')
    L = N[5]; P(L.s, 'zuwayla', 'in')
    L = N[6]; KT(L.s - .1, [ln('ترحيبٌ حارّ…', .3, c='g', sz=72, w=600), ln('ووعدٌ لا يحتمل الفشل', rel(L, L.w(6)), c='r', sz=116)], rule=True)
    L = N[7]; bg(L.s, 'map', dict(hi=['Egypt'], nile=dict(t=0, d=.1), cam=[[0, 2150, 1400, 900], [L.d, 2150, 1480, 640]],
             routes=[dict(a='cairo', b='aswan', t=.5, d=rel(L, L.w(12)) - .5, bend=-.08)],
             cities=[dict(k='cairo', t=0, big=1, side='r'), dict(k='aswan', t=rel(L, L.w(13)), red=1, big=1, side='r', sz=1.2)]))
    L = N[8]; P(L.s, 'philae_frere', 'in'); P(L.w(6), 'elephantine', 'l')
    L = N[9]; P(L.s, 'philae_flood', 'r')
    KT(L.w(5) - .2, [ln('«لو كان ما أريده ممكنًا…', .2, sz=82, w=500, font='naskh'), ln('لسبقني إليه هؤلاء»', rel(L, L.w(10)) - .1, c='r', sz=96, w=700, font='naskh')], bg_='wash')
    L = N[10]; P(L.s, 'eleph_map', 'in', size=700)
    L = N[11]; bg(L.s, 'map', dict(hi=['Egypt'], nile=dict(t=0, d=.1), cam=[[0, 2160, 1520, 760], [L.d, 2166, 1560, 420]],
             cities=[dict(k='aswan', t=0, red=1, big=1, side='r', sz=1.1)], pin=dict(k='aswan', t=rel(L, L.w(1)), tx='احفظ هذا المكان')))
    L = N[12]; P(L.s, 'cairo_street', dict(s0=1.12, s1=1.2, x0=-2, x1=2)); P(L.w(10), 'dinar', dict(s0=1.6, s1=1.9, x0=-14, x1=-14), size=620)

    M = [LN[f's3_madness_{i:02d}'] for i in range(16)]
    L = M[0]; P(L.s, 'hakim_mosque', dict(s0=1.15, s1=1.22, x0=3, x1=1)); P(L.w(8), 'qalawun', 'u')
    L = M[1]; P(L.s, 'haytham', dict(s0=1.3, s1=1.42, y0=10, y1=12), size=900)
    L = M[2]; bg(L.s - .1, 'list', dict(k='الحاكم بأمر الله', h='قراراتٌ لا يتوقّعها أحد', items=['قتلُ كلاب المدينة', 'تحريمُ أكل الملوخيّة', 'إعدامُ كثيرٍ من رجال الدولة'],
               times=[rel(L, L.w(1)), rel(L, L.w(5)), rel(L, L.w(8))]))
    L = M[3]; P(L.s, 'zuwayla', dict(s0=1.15, s1=1.25, x0=2, x1=-1))
    L = M[4]; KT(L.s - .15, [ln('تظاهرَ', .15, sz=140), ln('بالجنون', .55, c='r', sz=190)])
    L = M[5]; P(L.s, 'abbasid_ms', 'l')
    L = M[6]; P(L.s, 'cairo_street', dict(s0=1.0, s1=1.08, y0=-2, y1=1)); SUPER(L.w(4), L.e + .6, 'إقامة جبرية', 'القاهرة')
    L = M[7]; bg(L.s - .1, 'stat', dict(v=10, u='سنوات كاملة', s='1011 — 1021'))
    L = M[8]; P(L.s, 'mielot', 'in', size=900)
    L = M[9]; KT(L.s - .1, [ln('ماذا يفعل عقلٌ عبقريّ', .3, sz=92, w=600), ln('حين يُحبَس؟', rel(L, L.w(5)), c='r', sz=130)])
    L = M[10]; KT(L.s - .1, [ln('يبدأ', .1, c='g', sz=80, w=500), ln('بالتفكير', .35, sz=170)])
    L = M[11]; P(L.s, 'ayscough', dict(s0=1.0, s1=1.1, x0=-2, x1=0)); P(L.w(14), 'kircher', 'in', size=880)
    L = M[12]; P(L.s, 'eye_ms', 'in', size=900); P(L.w(11), 'alhazen_eye', 'in', size=900)
    L = M[13]; P(L.s, 'mokattam', 'in'); P(L.w(12), 'muqattam_air', 'l'); SUPER(L.w(13), L.e + 1.2, 'جبل المقطّم', '1021م')
    L = M[14]; KT(L.s - .1, [ln('اختفى.', .1, c='r', sz=170), ln('ولم يُعثَر على جثّته', rel(L, L.w(1)), c='g', sz=64, w=500)])
    L = M[15]; P(L.s, 'haytham', dict(s0=1.0, s1=1.06), size=900); bg(L.w(13) - .2, 'stat', dict(v=7, u='مجلّدات', s='KITAB AL-MANAZIR'))

    O = [LN[f's4_optics_{i:02d}'] for i in range(14)]
    L = O[0]; KT(L.s - .1, [ln('سؤالٌ يبدو بسيطًا', .2, c='g', sz=60, w=500), ln('كيف نرى؟', rel(L, L.w(3)), sz=170)], rule=True)
    L = O[1]; P(L.s, 'ptolemy_eng', 'in', size=900)
    L = O[2]; bg(L.s, 'diagram', dict(kind='emission', h='نظرية الانبعاث', sub='العين تُطلق أشعّةً نحو الأشياء'))
    L = O[3]; LOWER(L.w(5) - .1, L.e + .8, 'الكِندي', 'فيلسوف العرب · نحو 801 – 873م')
    L = O[4]; P(L.s - .2, 'haytham', dict(s0=1.02, s1=1.08), size=900)
    KT(L.w(12) - .1, [ln('لماذا تتألّم العين', .2, sz=88, w=600), ln('حين ننظر إلى الشمس؟', .5, c='r', sz=104)])
    KT(L.w(18) - .1, [ln('ولماذا يبقى أثر الضوء', .2, sz=88, w=600), ln('بعد أن نُغمض أعيننا؟', .5, c='r', sz=104)])
    L = O[5]; bg(L.s, 'diagram', dict(kind='emission', h='نظرية الانبعاث', sub='إقليدس · بطليموس · الكندي', tx=rel(L, L.w(5))))
    bg(L.w(8) - .2, 'diagram', dict(kind='intro', h='الضوء هو الذي يأتي إلى العين', sub='ثورة ابن الهيثم', t2=1.6))
    L = O[6]; bg(L.s, 'diagram', dict(kind='radiate', h='كل نقطة مضيئة تُرسل ضوءها', sub='في خطوطٍ مستقيمة، وفي كل اتجاه'))
    L = O[7]; P(L.s, 'ibnsahl', 'in', size=900)
    L8, L9, L10 = O[8], O[9], O[10]
    bg(L8.s, 'diagram', dict(kind='camera', h='تجربة البيت المظلم', sub='كما وصفها ابن الهيثم', tr=rel(L8, L8.w(8)),
       blk=rel(L8, L9.w(8)), unb=rel(L8, L9.w(14)) + .2))
    SUPER(L10.w(1), L10.e + .4, 'الضوء يسير في خطوطٍ مستقيمة')
    L = O[11]; P(L.s, 'camera_box', 'in', size=760); P(L.w(9), 'encyc_camera', 'in', size=860)
    L = O[12]; bg(L.s - .1, 'list', dict(k='كتاب المناظر', h='سبع مقالات غيّرت علم البصريات', items=['تركيب العين', 'انعكاس الضوء على المرايا', 'انكسار الضوء في الماء والزجاج', 'خداع البصر · لماذا يكبر القمر عند الأفق'],
               times=[rel(L, L.w(6)), rel(L, L.w(8)), rel(L, L.w(12)), rel(L, L.w(20))]))
    L = O[13]; P(L.s, 'thesaurus', 'in', size=900, cap='Opticae Thesaurus · بازل 1572')

    T = [LN[f's5_method_{i:02d}'] for i in range(9)]
    L = T[0]; P(L.s, 'haytham', dict(s0=1.0, s1=1.07, x0=0, x1=0), size=900)
    L = T[1]; P(L.s, 'ptolemy', 'out', size=900)
    KT(L.w(11) - .2, [ln('كان يُخضع كل شيء للتجربة', .2, c='g', sz=64, w=500), ln('الاعتبار', rel(L, L.w(18)) + .1, c='r', sz=180)])
    L = T[2]; bg(L.s - .1, 'diagram', dict(kind='method', h='الاعتبار', sub='المنهج كما مارسه ابن الهيثم', steps=['ملاحظة', 'فرضيّة', 'تجربة', 'نتيجة'],
               times=[rel(L, L.w(0)) + .1, rel(L, L.w(2)), rel(L, L.w(4)), rel(L, L.w(10))], loop=rel(L, L.w(5))))
    L = T[3]; bg(L.s, 'diagram', dict(kind='timeline', h='قبل عصر النهضة بستة قرون', from_=0, **{'from': 980, 'to': 1660},
               items=[dict(y=1015, l='ابن الهيثم · كتاب المناظر', red=True, up=True, t=.6), dict(y=1610, l='غاليليو', up=False, t=rel(L, L.w(13))), dict(y=1620, l='فرانسيس بيكون', up=True, t=rel(L, L.w(11)))],
               gap=[1015, 1615], gapl='≈ ستة قرون', gapt=rel(L, L.w(14))))
    L = T[4]; P(L.s, 'almagest', 'in', size=860)
    KT(L.w(13) - .1, [ln('كتاب', .1, c='g', sz=60, w=500), ln('الشكوك على بطليموس', .35, sz=120)], bg_='wash')
    L = T[5]; P(L.s, 'abbasid_ms', dict(s0=1.05, s1=1.15, x0=1, x1=-1))
    L = T[6]; bg(L.s - .3, 'quote', dict(text=L.L['text'].replace('...', '…'), attr='ابن الهيثم · الشكوك على بطليموس', t0=.5, t1=L.d - .2, size=64))
    L = T[7]; KT(L.s - .1, [ln('أن تشكّ في كلّ شيء…', .2, sz=96, w=600), ln('حتى في نفسك', rel(L, L.w(5)), c='r', sz=130)], rule=True)
    L = T[8]; P(L.s, 'haytham', dict(s0=1.06, s1=1.0), size=900); LOWER(L.w(3) - .1, L.w(5) + 1.2, 'جيم الخليلي', 'فيزيائي ومؤرّخ للعلوم')
    KT(L.w(5) + .3, [ln('«أوّل عالمٍ حقيقيّ', .1, sz=100, font='naskh'), ln('في التاريخ»', .45, c='r', sz=116, font='naskh')])

    E = [LN[f's6_europe_{i:02d}'] for i in range(9)]
    L = E[0]; P(L.s, 'azhar1900', 'u'); SUPER(L.w(8), L.w(13), 'الجامع الأزهر', 'القاهرة'); P(L.w(13), 'almagest', 'in', size=860)
    L = E[1]; bg(L.s - .1, 'stat', dict(v=200, pre='≈ ', u='مؤلَّفٍ يُنسب إليه', s='OPTICS · ASTRONOMY · MATHEMATICS'))
    L = E[2]; P(L.s, 'haytham', dict(s0=1.0, s1=1.05), size=900); SUPER(L.w(3), L.e + .8, 'رحل في القاهرة', 'نحو 1040م')
    L = E[3]; KT(L.s - .1, [ln('لم تنتهِ القصّة هنا…', .2, sz=92, w=600), ln('بل بدأت', rel(L, L.w(5)), c='r', sz=160)])
    L = E[4]; P(L.s, 'scriptorium', 'in', size=900); P(L.w(5), 'optics_cover', 'in', size=820)
    KT(L.w(19) - .3, [ln('ALHAZEN', .1, c='g', sz=70, w=500), ln('الهازن', .35, c='r', sz=180)])
    L = E[5]; bg(L.s, 'map', dict(cam=[[0, 1700, 950, 2600], [L.d, 1600, 900, 2300]],
             routes=[dict(a='cairo', b='oxford', t=.4, d=2.2, bend=.12), dict(a='cairo', b='viterbo', t=rel(L, L.w(6)), d=1.6, bend=.1)],
             cities=[dict(k='cairo', t=0, big=1, side='r'), dict(k='oxford', t=2.4, sub='روجر بيكون'), dict(k='viterbo', t=rel(L, L.w(7)) + 1, sub='فيتيلو', side='r')]))
    L = E[6]; P(L.s, 'thesaurus', 'in', size=900); SUPER(L.w(9), L.e + .6, 'بازل', '1572م')
    L = E[7]
    if A('kepler'): P(L.s, 'kepler', 'in', size=900); LOWER(L.w(2), L.w(13) - .3, 'يوهانس كيبلر', 'عالم فلك ألماني · 1571 – 1630م')
    else: KT(L.s - .1, [ln('يوهانس كيبلر', rel(L, L.w(2)), sz=124), ln('عالم فلك ألماني · 1571 – 1630م', rel(L, L.w(3)) + .2, c='g', sz=52, w=500)], rule=True)
    KT(L.w(13), [ln('Ad Vitellionem Paralipomena · 1604', .1, c='g', sz=44, w=500), ln('«إضافاتٌ إلى فيتيلو»', .35, sz=110)])
    L = E[8]; bg(L.s, 'map', dict(hi=['Iraq', 'Egypt'], cam=[[0, 2300, 1300, 1500], [L.d * .6, 1800, 950, 2800], [L.d, 1800, 950, 2900]],
             routes=[dict(a='basra', b='cairo', t=.3, d=1.4, bend=.16), dict(a='cairo', b='viterbo', t=rel(L, L.w(4)), d=1.4, bend=.1),
                     dict(a='viterbo', b='oxford', t=rel(L, L.w(5)) + .6, d=1.0, bend=.1), dict(a='viterbo', b='basel', t=rel(L, L.w(5)) + 1, d=.8, bend=-.2),
                     dict(a='basel', b='prague', t=rel(L, L.w(5)) + 1.6, d=.8, bend=-.2)],
             cities=[dict(k='basra', t=0, big=1), dict(k='cairo', t=rel(L, L.w(3)), big=1, side='r'), dict(k='viterbo', t=rel(L, L.w(5))),
                     dict(k='oxford', t=rel(L, L.w(5)) + 1.4), dict(k='basel', t=rel(L, L.w(5)) + 1.6, side='r'), dict(k='prague', t=rel(L, L.w(5)) + 2.2, side='r')]))

    F = [LN[f's7_ending_{i:02d}'] for i in range(9)]
    L = F[0]; bg(L.s - .2, 'map', dict(hi=['Egypt'], nile=dict(t=0, d=.1), cam=[[0, 2150, 1450, 1000], [L.d + .5, 2166, 1560, 520]],
             cities=[dict(k='aswan', t=.3, red=1, big=1, side='r', sz=1.1)], pin=dict(k='aswan', t=rel(L, L.w(3)), tx='أسوان')))
    L = F[1]; P(L.s, 'philae_flood', 'in')
    L = F[2]; P(L.s, 'elephantine', 'l'); P(L.w(10), 'dam_build', 'in'); P(L.w(14), 'nasser_sat', 'in', cap='السد العالي وبحيرة ناصر · NASA'); SUPER(L.w(12), L.e + .6, 'السد العالي', 'أسوان · اكتمل عام 1970م')
    L = F[3]; P(L.s, 'nasser_sat', dict(s0=1.12, s1=1.25, x0=4, x1=6, y0=-6, y1=-8))
    if A('philae_frere'): bg(L.w(7) - .2, 'split', dict(a=f"img/{A('philae_frere')}.jpg", b='img/nasser_sat.jpg', la='1011م', lb='1970م'))
    L = F[4]; KT(L.s - .1, [ln('لم يكن مخطئًا…', .2, sz=100, w=600), ln('كان سابقًا لزمانه', rel(L, L.w(3)), c='r', sz=140)], rule=True)
    L = F[5]; P(L.s, 'crater', 'in', cap='فوهة «الهازن» على سطح القمر · NASA')
    bg(L.w(7) - .2 if A('crater') else L.s, 'list', dict(k='بعد ألف عام', h='اسمٌ لا يُنسى', items=['فوهة «الهازن» على سطح القمر', 'الكويكب 59239 «الهازن»'],
       times=[.4 if A('crater') else rel(L, L.w(2)), 1.0 if A('crater') else rel(L, L.w(8))], nums=['01', '02']))
    L = F[6]; bg(L.s - .1, 'list', dict(k='بعد ألف عام', h='تكريمٌ عالمي', items=['صورته على عملة العراق الورقية', 'اليونسكو 2015 · السنة الدولية للضوء', 'ألف عام على كتاب المناظر'],
               times=[rel(L, L.w(1)), rel(L, L.w(11)), rel(L, L.w(17))], nums=['03', '04', '05']))
    L = F[7]; KT(L.s - .1, [ln('تظاهر بالجنون… ليحفظ عقله', .2, sz=84, w=600), ln('حُبس في الظلام…', rel(L, L.w(5)), c='g', sz=84, w=600), ln('فأهدى العالمَ الضوء', rel(L, L.w(8)), c='r', sz=124)])
    L = F[8]; P(L.s, 'camera_box', 'in', size=760); P(L.w(11) - .2, 'ayscough', 'in'); P(L.w(13), 'haytham', dict(s0=1.0, s1=1.08), size=900)

cues()

# ---------------- assemble ----------------
clips = []
BG.sort(key=lambda x: x[0])
HOOK_END = CARDS[0][1]
FRAMES_BLEED = [dict(s0=1.0, s1=1.07), dict(s0=1.32, s1=1.4, x0=-7, x1=-5, y0=-4, y1=-3), dict(s0=1.26, s1=1.34, x0=7, x1=5, y0=5, y1=3), dict(s0=1.36, s1=1.44, x0=2, x1=0, y0=-7, y1=-6)]
FRAMES_DOC = [None, dict(s0=1.55, s1=1.66, x0=-6, x1=-4, y0=-9, y1=-7), dict(s0=1.45, s1=1.55, x0=7, x1=5, y0=8, y1=6), dict(s0=1.6, s1=1.7, x0=0, x1=2, y0=12, y1=10)]
expanded = []
for i, (st, spec) in enumerate(BG):
    nxt = BG[i + 1][0] if i + 1 < len(BG) else END_CARD_S + 1.0
    d = nxt - st
    if spec['type'] == 'photo' and d > 4.6:
        n = min(4, int(d / 3.4 + .5))
        for k in range(n):
            sp = json.loads(json.dumps(spec))
            if k > 0:
                fr = (FRAMES_DOC if sp['p'].get('doc') else FRAMES_BLEED)[k % 4]
                if fr: sp['p']['kb'] = fr
                sp['p'].pop('cap', None)
            expanded.append((st + d * k / n, sp))
    else:
        expanded.append((st, spec))
BG = expanded
CUTS = []
XF = .3
for i, (s_, spec) in enumerate(BG):
    e = BG[i + 1][0] + XF if i + 1 < len(BG) else END_CARD_S + 1.5
    c = dict(id=f'bg{i:03d}', s=round(s_, 3), e=round(e, 3), z=10 + i, **spec)
    if c['type'] == 'photo': c.setdefault('fi', .3); c['punch'] = 1
    if i == 0: c['fi'] = 0
    clips.append(c); CUTS.append(round(s_, 3))
for j, ft in enumerate(FLASH):
    clips.append(dict(id=f'fl{j}', type='flash', s=round(ft, 3), e=round(ft + .45, 3), z=980, p=dict(color='#ffffff', peak=.95)))
for i, c in enumerate(OV): c['id'] = f'ov{i:03d}'; c['s'] = round(c['s'], 3); c['e'] = round(c['e'], 3); clips.append(c)
for i, cd in enumerate(CARDS):
    if cd[0] == 'title':
        clips.append(dict(id='title', type='title', s=cd[1], e=cd[2], z=900, fi=.6, fo=.6,
                          p=dict(img='img/haytham.jpg', imgpos='50% 30%', kicker='الحسن بن الهيثم', l1='سجين', l2='الضوء', dates='965 <b>/</b> 1040')))
    else:
        clips.append(dict(id=f'card{i}', type='chapter', s=cd[1], e=cd[2], z=900, p=dict(num=cd[3], k=cd[4], h=cd[5])))
clips.append(dict(id='end', type='endcard', s=END_CARD_S, e=DURATION, z=950, p=dict()))
bugr, cur = [], 3.0
for cd in sorted(CARDS, key=lambda x: x[1]):
    bugr.append([cur, cd[1] + .2]); cur = cd[2] - .2
bugr.append([cur, END_CARD_S + .3])
TL = dict(duration=round(DURATION, 3), bug=bugr, bugLight=[], clips=clips)
open('build/timeline.js', 'w').write('window.TL=' + json.dumps(TL, ensure_ascii=False) + ';')
json.dump(dict(cuts=CUTS, flashes=FLASH, hook_end=HOOK_END, lines=[dict(id=l.id, s=round(l.s, 3), d=round(l.d, 3), trim0=l.L['trim0'], src=l.L['src'], text=l.L['text'],
                           words=[dict(t=round(l.s + w['t'] - l.L['trim0'], 3), d=w['d'], w=w['w']) for w in l.L['words']]) for l in SCHED],
               cards=CARDS, duration=DURATION, end_card=END_CARD_S), open('build/schedule.json', 'w'), ensure_ascii=False, indent=1)
missing = sorted({k for k in ASSETS} - AV)
print(f'duration {DURATION:.1f}s ({DURATION/60:.2f} min), {len(clips)} clips, bg {len(BG)}, ov {len(OV)}')
print('assets missing (fallbacks used):', ' '.join(missing))
