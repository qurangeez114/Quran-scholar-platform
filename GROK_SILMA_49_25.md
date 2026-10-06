# Grok assignment — SILMA plain-reading Quran audio, Surahs 49 → 25

Work in repository `qurangeez114/Quran-scholar-platform` on `main`.

## Scope
Produce and deploy **Surahs 49 down through 25 inclusive**. Do not overlap the ChatGPT batch (113→50). Do not modify or delete already deployed audio.

## Required audio
Use the existing **SILMA Arabic TTS** pipeline and the same approved neutral/plain-reading style:
- clear natural Arabic speech
- correct Arabic pronunciation
- neutral, steady delivery
- no melodic Qur'anic chanting, singing, or deliberate vocal ornamentation
- SILMA settings: `seed=42`, `speed=1`
- use SILMA's Arabic reference `ar.ref.24k.wav` and the same reference text already present in the workflow.

## Text integrity
For every surah, obtain the Arabic Qur'an text from a reliable Uthmani-script source. Preserve the verse order and verify the returned surah number, verse count, and `numberInSurah`. Never invent or paraphrase Qur'an text.

## File convention
For each verse:
`audio/simple-recitation/SSS_AAA.mp3`

Examples:
- Surah 49 ayah 1: `audio/simple-recitation/049_001.mp3`
- Surah 25 ayah 77: `audio/simple-recitation/025_077.mp3`

Also produce:
`audio/simple-recitation/surah_SSS_complete.mp3`

MP3 conversion must use ffmpeg/libmp3lame at quality `-q:a 2`.

## Processing order
Strictly work backward:
`49, 48, 47, ... 26, 25`.

Parallel GitHub Actions jobs are acceptable, but each surah must be independently verifiable and failures must not cancel the remaining surahs.

## Deployment
Commit the generated **MP3 files only** to `audio/simple-recitation/` on `main`. WAV files are temporary generation files and must not be committed. A GitHub Actions artifact backup may contain WAV + MP3.

Because multiple jobs may push concurrently, pull/rebase before pushing and retry push conflicts safely. Never force-push.

## Verification before declaring completion
For every surah 49→25:
1. Confirm every expected verse MP3 exists.
2. Confirm the verse file count equals the canonical ayah count.
3. Confirm `surah_SSS_complete.mp3` exists and is non-empty.
4. Confirm files are present on `main`, not merely in an Actions artifact.
5. Report any failed surah explicitly and rerun/fix it.
6. Do not say complete until all 25 surahs are verified.

## Coordination rule
ChatGPT is handling **113→50**. Grok owns **49→25**. Do not edit the 113→50 range unless asked to repair a specific shared infrastructure problem.

Keep the existing QuranHikma naming convention and avoid unrelated site changes.
