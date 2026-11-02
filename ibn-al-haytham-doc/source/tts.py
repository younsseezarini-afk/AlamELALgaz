import asyncio, ssl, sys, json
import edge_tts, edge_tts.communicate as C
C._SSL_CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
async def synth(text, voice, out, rate='-6%', pitch='-2Hz'):
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary='WordBoundary')
    words = []
    with open(out, 'wb') as f:
        async for ch in comm.stream():
            if ch['type'] == 'audio': f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'t': ch['offset']/1e7, 'd': ch['duration']/1e7, 'w': ch['text']})
    return words
if __name__ == '__main__':
    text, voice, out = sys.argv[1], sys.argv[2], sys.argv[3]
    rate = sys.argv[4] if len(sys.argv) > 4 else '-6%'
    pitch = sys.argv[5] if len(sys.argv) > 5 else '-2Hz'
    w = asyncio.run(synth(text, voice, out, rate, pitch))
    json.dump(w, open(out + '.json', 'w'), ensure_ascii=False)
    print(out, len(w), 'words')
