import asyncio, json, re, sys
sys.path.insert(0, '.')
from tts import synth
VOICE = sys.argv[1] if len(sys.argv) > 1 else 'ar-SA-HamedNeural'
segs = json.load(open('segments.json'))
jobs = []
for sg in segs:
    for i, ln in enumerate(sg['text'].split('\n')):
        t = re.sub(r'\[[^\]]*\]\s*', '', ln).strip()
        if t: jobs.append((sg['id'], i, t))
sem = asyncio.Semaphore(3)
async def run(j):
    sid, i, t = j
    out = f'vo/lines/{sid}_{i:02d}.mp3'
    async with sem:
        for attempt in range(4):
            try:
                w = await synth(t, VOICE, out, rate='-7%', pitch='-3Hz')
                json.dump({'text': t, 'words': w}, open(out + '.json', 'w'), ensure_ascii=False)
                return
            except Exception as e:
                print('retry', out, e); await asyncio.sleep(2 ** attempt)
async def main():
    await asyncio.gather(*[run(j) for j in jobs])
asyncio.run(main())
print(len(jobs), 'lines')
