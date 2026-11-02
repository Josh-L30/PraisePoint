# PraisePoint welcome video

## Approved Open Welcome background

`login-auditorium.jpg` is the user-approved AI-enhanced widescreen reconstruction of their CCF auditorium reference (original 387 × 516; enhanced 1672 × 941). Some auditorium/congregation details are reconstructed, not exact photographic restoration. The user reviewed the full-screen reference and selected Open Welcome for deployment on 2026-11-02. Converted to quality-92 JPEG, 812,221 bytes, retaining the original enhanced PNG in the local preview. Firebase serves this hashed background; it does not consume Supabase Storage. Like the earlier login photograph, it is outside the verified offline shell; the login has a dark teal fallback if unavailable.

## Entrance video

S23: keep the door-opening playback at 1.6×, accelerate the final two source seconds into white to 2.6×, then reveal login after a 140ms white fade and 160ms handoff. The source video is unchanged. This supersedes the uniform playback timing below.

`ccf-door-welcome.mp4` is the user-approved V4 AI-generated entrance, created in Google Flow from the supplied CCF door photo and a fictional AI greeter. Generated on 2026-11-02 using free credits; no paid subscription. It is not filmed footage. The user approved publication on 2026-11-02 after reviewing the corrected right-hand movement.

This approximately 8-second, 1280×720 MP4 is served by Firebase Hosting as a content-hashed Vite asset. It is not uploaded to Supabase and is intentionally excluded from the offline shell precache. S15 plays it at 1.6× (about five seconds) with no visible Skip button. Mobile, reduced-motion and offline visits bypass it; loading/playback failure or Escape reveals login, with a 7.5-second maximum waiting deadline. It plays once per tab session.

Original downloaded file: `Man_pulling_door_open_6cda9b1c.mp4`, 2,504,788 bytes. Prototype and rejected versions are retained locally under ignored `.superpowers/S14-preview/`. See `docs/evidence/S14-free-ai-video.md` for creation and review history.
