# سجين الضوء — كود الإنتاج

خط الإنتاج (يعمل بالترتيب):
1. `gen_vo.py` — توليد التعليق الصوتي سطرًا سطرًا (صوت عربي عصبي) مع توقيت كل كلمة.
2. `dl_wiki.py archival_list.txt` ثم `prep_images.py` — تنزيل الصور الأرشيفية ومعالجتها (تدرّج لوني موحّد).
3. `build_timeline.py` — بناء الخط الزمني: كل صورة ورسم متزامن مع الكلمات.
4. `mix_audio.py` — مزج الصوت والموسيقى والمؤثرات (‎-14 LUFS).
5. `render_parallel.sh 0 <المدة> 4 out.mp4` — التصيير عبر Chromium/Playwright (محرّك `build/engine.js`).

التصميم: `build/style.css` (الخط IBM Plex Sans Arabic + Noto Naskh Arabic، الأبيض/الأسود/الأحمر #c8102e).
