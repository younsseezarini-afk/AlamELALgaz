import asyncio, json, re, sys, os
sys.path.insert(0, '.')
from tts import synth
VOICE = 'ar-KW-FahedNeural'
OUT = 'vo/lines2'
os.makedirs(OUT, exist_ok=True)
segs = json.load(open('segments.json'))
SLOW = {'تظاهرَ بالجنون.', 'يبدأُ بالتفكير.', 'اختفى... ولم يُعثَر على جثّتِه.'}
jobs = []
for sg in segs:
    for i, ln in enumerate(sg['text'].split('\n')):
        t = re.sub(r'\[[^\]]*\]\s*', '', ln).strip()
        if not t: continue
        rate, pitch = '+9%', '-1Hz'
        if sg['id'] == 's0_hook': rate, pitch = '+11%', '+1Hz'
        if t.endswith('؟') or '؟' in t: pitch = '+4Hz'
        if t in SLOW or len(t) < 22: rate = '+0%'
        if sg['id'] == 's8_cta': rate, pitch = '+6%', '+2Hz'
        jobs.append((sg['id'], i, t, rate, pitch))
sem = asyncio.Semaphore(3)
async def run(j):
    sid, i, t, rate, pitch = j
    out = f'{OUT}/{sid}_{i:02d}.mp3'
    async with sem:
        for a in range(5):
            try:
                w = await synth(t, VOICE, out, rate=rate, pitch=pitch)
                json.dump({'text': t, 'words': w, 'rate': rate, 'pitch': pitch}, open(out + '.json', 'w'), ensure_ascii=False); return
            except Exception as e:
                print('retry', out, e); await asyncio.sleep(2 ** a)
async def main(): await asyncio.gather(*[run(j) for j in jobs])
asyncio.run(main()); print(len(jobs), 'lines')
