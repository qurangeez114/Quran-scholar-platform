# Assignment — SILMA plain-reading audio for Warsh differences only

Work in `qurangeez114/quran-scholar-platform` on `main`.

## Scope
Only the verses where the Warsh reading genuinely differs from Hafs, not the whole Quran. About 1,989 verses.

The list is in Supabase table `riwayat_audio_targets` (columns `sura_id`, `aya_number`, `riwayah`; publicly readable). Fetch it with the project URL and anon key already used in `index.html`:

`GET {SUPABASE_URL}/rest/v1/riwayat_audio_targets?riwayah=eq.warsh&select=sura_id,aya_number&order=sura_id,aya_number&limit=5000`

Verse text to read: `ayas.arabic_warsh` for the same `sura_id` and `aya_number`. Read it exactly as stored. Do not substitute Hafs text.

## Audio
Same approved SILMA pipeline and settings as `audio/simple-recitation` (`seed=42`, `speed=1`, reference `ar.ref.24k.wav`, same reference text). Plain, neutral reading with no chanting. MP3 via ffmpeg/libmp3lame `-q:a 2`. Commit MP3s only, not WAVs.

## File convention
`audio/riwayat/warsh/SSS_AAA.mp3`, for example `audio/riwayat/warsh/002_004.mp3`.

## Order and deployment
Work backward from sura 114 to sura 2 (only suras that appear in the list). Pull/rebase before each push, never force-push. Do not touch `audio/simple-recitation`.

## Verification
1. Every listed verse has a non-empty MP3 on `main`.
2. File count per sura equals the list count for that sura.
3. Report failures explicitly and rerun them. Do not declare completion until all are verified.

## Later
Qalun (1,909 verses) and Duri (1,789) follow the same pattern with `riwayah=eq.qalun` / `eq.duri` and `ayas.arabic_qalun` / `arabic_duri`, in `audio/riwayat/qalun/` and `audio/riwayat/duri/`. Start only after Warsh is verified.
