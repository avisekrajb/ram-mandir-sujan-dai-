# Newsletter tests

Everything here runs against a THROW-AWAY stack: its own MongoDB on port 27700 (databases `nl_test`, `nl_unit`), a test backend on port 5700 with every real secret blanked, and e-mails written to JSON files (`EMAIL_DEBUG_DIR`) instead of being sent. Nothing touches the real database, the real `.env` files or Gmail.

The scripts were written to run from a scratch folder (they use `__dirname` for the `mail`, `mail-unit` and `shots` folders). Copy `tests\` somewhere writable first, e.g. `C:\temp\nl\`, and run from there.

1. Start a throw-away MongoDB: `mongod --dbpath <empty folder> --port 27700 --bind_ip 127.0.0.1`
2. `node fresh-backend.js` - stops whatever listens on :5700, empties `nl_test`, starts the test backend (`launch-backend.js`), waits for it.
3. `node nl-api-tests.js` - 94 checks: subscribe / confirm / unsubscribe, e-mail templates in 5 languages x every kind, admin API (auth matrix, CSV, settings, festivals, announce / test / cancel / retry), event + blog hooks and the mailings they create.
4. `node nl-worker-tests.js` - 39 checks, in process on `nl_unit`: daily limit + resume, concurrent workers, failure streak + retry, festival sweep with a pretend patro and pretend clocks, legacy backfill.
5. UI: `node proxy4200.js` (front door :4200: `/api` -> :5700, everything else -> the dev server on :4000), then `node nl-ui-test.js` - 28 checks in headless Chrome: the band on 14 pages, validation, a full subscribe -> e-mail -> confirm -> welcome round trip, 5 languages, 390 px phone, switched off in Admin -> Footer, the admin page. Screenshots go to `shots\`.
6. `node mail-previews.js` - renders the e-mails to PNGs (`shots\mail\`).

Paths inside the scripts point at `C:/Users/Acer/Desktop/New folder/backend/backend` and Chrome in `C:/Program Files/Google/Chrome`; change them if the project moves.
