# Newsletter: "Stay updated" on every page + e-mail for events and festival wishes

Started 2026-10-05. Pre-change copies of every edited file: `_backups\newsletter-pre\`.

## What the owner asked for
"in every page add subscribe to stay updated and nodemailer use to send mail for them like for events and occasional festival wishing"

## Design (decided and built)
- **Every page**: a flat "Stay updated" band (`components/common/StayUpdated.jsx`, mounted in `Layout.jsx` above the footer; hidden if Admin -> Footer -> Subscribe is off). Visitors need no account: e-mail + three topic ticks (Events / Festival wishes / News). Replaces the old sign-in-only card on the Team page.
- **Double opt-in**: the form only sends a confirmation e-mail (same answer for known and unknown addresses, rate limited, honeypot `hp_field`); nobody is mailed before confirming. Confirm / unsubscribe pages are served by the API (GET shows a button, POST changes anything, because mail scanners open links). Every mail has a personal unsubscribe link + `List-Unsubscribe` / `List-Unsubscribe-Post` headers.
- **Events / blogs**: creating an event (Admin -> Events, or `POST /api/events`) or publishing a blog post queues ONE mailing (dedupe by id; a blog switched off and on is not mailed twice). `notifySubscribers:false` skips it. Sent in the background, one e-mail at a time, resumable, daily cap, each subscriber in their own language (en/ne/hi/zh/ta).
- **Festival wishes**: a scheduler (every 15 min) reads the public patro (usemiti.com, cached 12 h) and queues ONE wish per day between 06:00 and 19:59 Nepal time for a curated list of major festivals (9 on by default in the next 400 days: Ghatasthapana, Vijaya Dashami, Laxmi Puja, Bhai Tika, Maghe Sankranti, Maha Shivaratri, Holi, Ram Navami...). About 14 optional ones are off until the admin switches them on. The admin can edit the wording per festival in 5 languages.
- **Admin**: Admin -> Management -> "Subscribers & mail" (access area `contact`): subscribers (search, filter, CSV export, delete), send a mailing (event / blog / own message, test mail first, audience count, "send again"), automatic-mail switches + daily limit, festival wishes, history (cancel / try again).
- Legacy subscribers (rows from before this feature) are upgraded at server start: active, **events + news only** (what the old form promised; festival wishes stay off for them until they tick it), English, own unsubscribe link.

## Needs from the owner (production)
1. `BACKEND_URL` = the API's public https address (confirm / unsubscribe links in e-mails point there; without it they fall back to `FRONTEND_URL`, which must then forward `/api`). A start-up warning says so.
2. `EMAIL_USER` / `EMAIL_PASS` (Gmail app password) as before. The first real send has not been tried against Gmail from this machine: use Admin -> Subscribers & mail -> Send a mailing -> "Send me a test".
3. Gmail allows roughly 500 messages a day; the daily limit defaults to 400 and a large mailing carries on the next day (Admin -> Send a mailing -> Daily sending limit).
4. Have someone who reads Chinese and Tamil look at the `zh` / `ta` wording (public band: `utils/i18n/newsletter1.js`; e-mails: `services/newsletterEmail.js`).

## Status: built, tested, reviewed (see below)
- [x] models: Subscriber (extended), NewsletterCampaign (`templenewslettercampaigns`), NewsletterSettings (`templenewslettersettings`)
- [x] emailService: allow-listed headers + `EMAIL_DEBUG_DIR` test transport
- [x] newsletterEmail (5 languages), festivalService, newsletterService (+ scheduler)
- [x] routes: public subscribe / confirm / unsubscribe, admin API (`/api/newsletter`); event / blog hooks; server.js backfill + scheduler
- [x] frontend: StayUpdated band, i18n `nl_*`, Layout, Team-page card removed
- [x] admin page "Subscribers & mail"
- [x] tests: `_dev-tools\newsletter\tests\` - nl-api-tests.js (94 checks), nl-worker-tests.js (39), nl-ui-test.js (28 in headless Chrome), mail-previews.js (all e-mails in 5 languages as PNGs)
- [x] independent review (backend + frontend), fixes (below), memory note, tools copied

## Bugs the tests found (all fixed)
- Confirm / unsubscribe buttons failed in a real browser ("Origin not allowed"): the API-wide `Referrer-Policy: no-referrer` makes a browser send `Origin: null` on a form POST. The confirm / unsubscribe pages (and the older reminder-unsubscribe page, same problem) now send `Referrer-Policy: same-origin`.
- Legacy subscribers were not upgraded properly (Mongoose defaults hid the missing fields), so they would have got no mail: backfill now reads raw rows.
- A person who confirmed and unsubscribed within 10 minutes was refused a new confirmation: the throttle marker is cleared on confirm / unsubscribe.
- After 10 failures in a row the mailing stopped but "try again" skipped those people: they are put back so a retry reaches them.
- `POST /api/events` (the older route) did not queue the mailing: it does now, like Admin -> Events.

## Independent reviews and what they changed (all fixed, re-tested)
Backend review (13 findings):
- the confirmation throttle was a read-then-write race (8 parallel asks sent 5 mails): now one atomic claim; the mail is sent in the background so response time does not reveal known addresses
- rate limiting is by IPv6 /64 (rotating addresses no longer dodges it); daily ceiling on confirmation mails (300, `NEWSLETTER_CONFIRM_DAILY_MAX`)
- someone who unsubscribes mid-mailing is skipped (re-checked right before each e-mail); cancel is honoured within one e-mail and can no longer be undone by the daily limit; a worker that lost its lease stops (lease owner + renewal per e-mail; nodemailer timeouts 20s/60s)
- festival wishes go first, may use 10% over the daily limit, and EXPIRE at the end of their Nepal-time day (status `expired`) instead of arriving days late
- same custom announcement twice within 10 minutes is refused (409, "send again" overrides); confirm links expire after 7 days; unconfirmed rows are purged after 30 days; unusable old rows are parked as unsubscribed
- default daily limit lowered to 300 (the same Gmail account sends sign-in codes, bookings, reminders); overview shows a Nepal-time "sent today"; production without `BACKEND_URL` refuses to send mailings (admin gets the reason)

Frontend review (8 findings): deleting the last row of the last page left an empty page; festival rows unreadable at 390 px; the `contact` access area now says it also covers subscribers and mailings (English + Nepali strings; other languages fall back to English); focus moves to the result after subscribing and back to the field after "use a different address"; filter changes no longer fire two requests (newest reply wins); the signed-in address is removed from the band at sign-out; darker input / chip borders and focus ring (contrast); the band no longer says "press Confirm" (the button reads "Yes, subscribe me").

Real backend restarted 2026-10-06 with this code (3 legacy subscribers upgraded: active, events + news).

## How to re-run
See `_dev-tools\newsletter\README.md`.
