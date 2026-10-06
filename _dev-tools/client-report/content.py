# -*- coding: utf-8 -*-
"""Client edition of the report (final). Simple language, no technical settings or code. One source for the Word file and the PDF."""

TITLE = "Security & Features Report"
SYSTEM = "Shree Ramchandra Temple (Ram Mandir) — Website and Administration Portal"
SUBTITLE = "How ZeroInfinity Infotech protects the system, and what the system does"

COVER = [
    ("Prepared by", "ZeroInfinity Infotech — Administration"),
    ("Prepared for", "Ram Mandir (Shree Ramchandra Temple) administration"),
    ("Verified by", "Sujan Subedi, Founder, ZeroInfinity Infotech"),
    ("Report date", "6 October 2026"),
    ("Version", "Final — client edition"),
    ("Classification", "Confidential — for the Ram Mandir administration only"),
]

FOOTER = "ZeroInfinity Infotech  |  zeroinfinitytechnologies.com  |  Confidential — prepared for the client"

BUILT = "Built in"
LAUNCH = "Set up at launch"
DONE = "Done"
GOOD = (BUILT, DONE)  # shown in green; everything else in blue

B = []  # blocks
h1 = lambda t: B.append(("h1", t))
h2 = lambda t: B.append(("h2", t))
p = lambda t: B.append(("p", t))
note = lambda t: B.append(("note", t))
lead = lambda t: B.append(("lead", t))
ul = lambda items: B.append(("ul", items))
table = lambda head, rows, widths, status=None, boldfirst=True: B.append(("table", dict(head=head, rows=rows, widths=widths, status=status, boldfirst=boldfirst)))

# ------------------------------------------------------------------------------------------------ 1
h1("1. Our commitment to security")
p("At ZeroInfinity Infotech, security is not something we add at the end. It is part of how we design, build, test and look after every system. The temple holds information that devotees trust it with: names, phone numbers, bookings and donations. We protect that information, and we protect the temple’s good name.")
p("This report explains in simple words how the Ram Mandir website and administration portal are protected, what the system does, and what we suggest the temple does to stay safe. It contains no technical settings or code.")
lead("Protection in three layers")
B.append(("image", "layers.png", 16.6, "Figure 1 — The three layers of protection around the temple’s website and portal"))
ul([
    ("1. The software. ", "The system itself checks every request: who is asking, what they are allowed to do, and whether what they sent is safe."),
    ("2. The hosting server. ", "The server that hosts the website adds an outer wall: an encrypted connection, a firewall, an attack filter and malware scanning."),
    ("3. People and routine. ", "Strong passwords, two-step sign-in, regular updates, monitoring, and a security check after every change."),
])
lead("Good to know")
p("These protections are part of the new version of the system prepared by ZeroInfinity Infotech. The protections inside the software start working on the day this version is installed on the temple’s hosting, and the server protections are set up and checked by us at the same time (section 9). No system can ever be made completely risk-free, which is why we also test, update and watch it over time.")

# ------------------------------------------------------------------------------------------------ 2
B.append(("h1pb", "2. Security at a glance"))
table(
    ["Protection", "How it protects the temple", "Status"],
    [
        ["Safe sign-in", "Passwords are scrambled so nobody can read them. People can sign in with Google or an e-mailed one-time code. Guessing is blocked.", BUILT],
        ["The right access for the right person", "Visitors, administrators and a super administrator. Each administrator only gets the areas they need.", BUILT],
        ["Safe donations and bookings", "Every payment is confirmed directly with eSewa, Khalti or ConnectIPS. A donation is never accepted just because a web page says so.", BUILT],
        ["Safe handling of everything typed or uploaded", "Forms, links and uploads are checked, so nobody can slip in harmful commands or files.", BUILT],
        ["Safe e-mail and newsletter", "Nobody is added without confirming from their own inbox. Every message has an unsubscribe link.", BUILT],
        ["Protection against abuse and spam", "Limits stop robots and flooding. Spam and rude messages are filtered. Reviews wait for approval.", BUILT],
        ["Privacy of devotees", "Phone numbers, booking references and secret links are kept out of logs and statistics.", BUILT],
        ["Activity records", "Important actions by administrators are recorded: who, what and when.", BUILT],
        ["Backup and restore tool", "Backups can be made and restored from the portal, by the super administrator only.", BUILT],
        ["Protected hosting server", "Encrypted connection, firewall, attack filter, malware scanning and protected logins (section 4).", LAUNCH],
        ["Automatic nightly backups", "A copy of the whole website, kept in a different place from the server.", LAUNCH],
        ["Testing and independent review", "Three separate security reviews, simulated attacks on a safe copy, fixes, and a second review of the fixes (section 5).", DONE],
    ],
    [4.4, 9.4, 2.8],
    status=2,
)
note("“Built in” means the protection is part of the system. “Set up at launch” means ZeroInfinity Infotech sets it up on the temple’s hosting and checks it when the system goes live. “Done” means it has been carried out.")

# ------------------------------------------------------------------------------------------------ 3
h1("3. How the system protects the temple")
h2("3.1 Safe sign-in")
ul([
    "Passwords are stored in a scrambled form that nobody can read back, not even us or the temple’s administrators.",
    "Strong password rules: at least 8 characters, and common passwords such as “123456” or simple patterns are refused.",
    "People can sign in with Google, or with a one-time code sent to their e-mail, so they do not have to remember yet another password.",
    "One-time codes work only once, expire after 10 minutes, and allow only a few tries.",
    "Guessing is blocked. After repeated wrong attempts, sign-in pauses for a short time. The system never tells a stranger whether an e-mail address has an account.",
    "Sessions can be ended. An administrator can suspend an account, and changing a password signs the person out on their other devices.",
    "The first administrator account is created only once. Its password can be changed only inside the portal and is never silently reset.",
])
h2("3.2 The right access for the right person")
ul([
    "Three levels: visitor, administrator and super administrator.",
    "The super administrator decides which areas each administrator can use: website content, bookings, donations, messages, users, visitor statistics or the system tools.",
    "These rules are enforced by the system every time, not just hidden on the screen. We tested every part of the system as a visitor and as an ordinary user to prove that nobody can change anything they should not.",
    "A new administrator has no powers until they choose their own private password.",
    "The most sensitive actions, such as the donation settings and restoring a backup, are for the super administrator only.",
])
h2("3.3 Safe donations and bookings")
ul([
    "Every payment is confirmed directly with eSewa, Khalti or ConnectIPS by our system. A donation is never accepted just because a web page says it was paid.",
    "Amounts are checked, and a payment can never be counted twice.",
    "The test-payment hints used while the system was being built are hidden on the live website.",
    "Booking details are checked and limited, so the booking lists cannot be flooded with false requests.",
])
h2("3.4 Safe handling of everything typed or uploaded")
ul([
    "Everything typed into a form is checked and cleaned before it is used, so nobody can slip harmful commands into the system.",
    "Links saved by administrators are checked, so a link cannot secretly run a harmful program.",
    "Visitors can upload pictures only, with size limits. Other file types are refused.",
    "Photographs and videos are kept with a professional media service, not on the website’s own server.",
])
h2("3.5 Safe e-mail and newsletter")
ul([
    "Nobody is added to the newsletter until they confirm from their own inbox.",
    "Every message has an unsubscribe link, and leaving takes one click.",
    "The sign-up form answers everybody in the same way, so a stranger cannot find out who is subscribed.",
    "Daily limits protect the temple’s mail account from being blocked, and nobody receives the same mailing twice.",
    "Festival greetings are sent only on the day of the festival.",
    "Whatever a visitor types can never change the content of an e-mail the temple sends.",
])
h2("3.6 Protection against abuse and overload")
ul([
    "Limits on repeated actions (signing in, creating accounts, sending messages, bookings, uploads) stop robots and flooding.",
    "The contact form filters spam, links and rude messages in several languages.",
    "Visitor reviews appear only after an administrator approves them.",
    "A problem in one part of the system cannot bring the whole website down.",
])
h2("3.7 Privacy of devotees")
ul([
    "Phone numbers, booking references and secret links are kept out of the system’s logs and visitor statistics.",
    "Visitors see friendly messages if something goes wrong; technical details stay hidden.",
    "The administrators’ database tools never show anyone’s password.",
    "Newsletter subscribers can leave at any time with one click, and their address is used only for the temple’s own updates.",
])
h2("3.8 Activity records and warnings")
ul([
    "The system records important actions by administrators, such as changing content, approving a donation or sending a mailing: who did it and when. The super administrator can review this record at any time.",
    "Administrators receive alerts for new bookings, donations and subscribers.",
    "When the system starts, it checks its own settings and warns about anything unsafe.",
])
h2("3.9 Backups")
ul([
    "The portal has a backup and restore tool. Backup files are private and can be downloaded for a short time only.",
    "Only the super administrator can restore or delete a backup, and a restore never overwrites people’s accounts.",
    "At launch we also set up automatic nightly backups of the whole website, with a copy kept somewhere else (section 4).",
])

# ------------------------------------------------------------------------------------------------ 4
h1("4. How the hosting server is protected")
p("The website runs on cPanel hosting. We set up and check the protections below on the temple’s hosting when the system goes live, and we review them regularly after that.")
table(
    ["Protection", "What it does for the temple"],
    [
        ["Encrypted connection (the padlock)", "Everything visitors and administrators send and receive travels encrypted. The security certificate renews by itself."],
        ["Firewall", "Lets in only the traffic the website needs and blocks the rest."],
        ["Attack filter", "Recognises and blocks common attacks on web pages before they reach the system."],
        ["Protected hosting logins", "Two-step sign-in, strong passwords, and automatic blocking of repeated wrong attempts."],
        ["Malware scanning", "Daily scans of the hosting account, with suspicious files removed to a safe place."],
        ["Private files stay private", "Settings, backups and system files are kept outside the public area, so nobody can download them."],
        ["Secret keys kept safe", "The temple’s secret keys are stored in the hosting’s protected settings, never in the website’s files. We set new, strong keys for the live website."],
        ["Database protection", "The temple’s database accepts connections only from the temple’s own server, with its own user and a strong password."],
        ["Browser protection", "Tells visitors’ browsers to use safe mode and to refuse hidden framing and misuse of the website."],
        ["E-mail protection", "Records that prove an e-mail really comes from the temple, so nobody can easily send fake e-mail in its name."],
        ["Updates and watching", "Security updates, a monitor that alerts us if the website stops, and regular review of the logs."],
        ["Nightly backups", "A copy of the whole website every night, kept in a different place from the server."],
    ],
    [5.0, 11.6],
)

# ------------------------------------------------------------------------------------------------ 5
h1("5. How we tested the system")
ul([
    ("A full security audit on 5 October 2026. ", "Three separate reviews looked at the system’s inner workings, the website pages, and the configuration and files used to run it."),
    ("Simulated attacks on a safe copy. ", "We tried to break the system the way a real attacker would: forged logins, harmful text in forms, reaching other people’s information, floods of requests and harmful uploads. This was done on a copy, never on the temple’s real data."),
    ("Every important weakness was dealt with. ", "All the important weaknesses that could be fixed inside the system were fixed and then attacked again to prove the fix. A few small, low-risk items are planned for a later update, and the rest depend on the live server’s keys and settings, which we set up with the temple at launch."),
    ("A second review of our own fixes. ", "A separate reviewer checked every fix for mistakes and ways around it. The problems it found were corrected."),
    ("The newsletter was reviewed on its own. ", "Its sending and its screens were each reviewed independently, and every point raised was addressed."),
    ("More than 290 automatic checks. ", "They test sign-in, access rules, payments, uploads, e-mail and the newsletter, and we run them again after every change."),
])

# ------------------------------------------------------------------------------------------------ 6
h1("6. What the system does")
table(
    ["Area", "What it offers"],
    [
        ["Home page", "Temple timings, daily aarti, daily quote, upcoming events, a notice pop-up, and Live Darshan from the temple’s Facebook page."],
        ["About, History and Team", "The story of the temple, its history, and the committee and staff."],
        ["Events and puja booking", "Upcoming and past events with photographs. Devotees can book pujas and services, receive a booking reference, and see their bookings again later."],
        ["Donations", "Donate through eSewa, Khalti or ConnectIPS, or by bank account or QR code. A receipt after each donation, and a personal list of bookings and donations."],
        ["Gallery and blogs", "Photographs in categories with titles and descriptions, and articles and notices published by the temple."],
        ["Patro calendar", "Nepali calendar with festivals, tithi, Ekadashi, Purnima, Aunsi, sunrise and sunset. Dates can be saved to a phone calendar, and devotees can ask for an e-mail reminder before a festival."],
        ["Tools", "Date converter (Nepali and English), Unicode and Preeti converter, currency exchange, and time and weather for Kathmandu."],
        ["Contact and reviews", "A message form with a spam filter, map and directions, frequently asked questions, and visitor reviews that appear after approval."],
        ["Stay updated (newsletter)", "Devotees choose Events, Festival wishes and News. The temple can announce new events and blog posts, and the system sends a greeting on the day of about nine major festivals."],
        ["Chat assistant", "Answers common questions about timings, events, donations and bookings."],
        ["Five languages", "English, Nepali, Hindi, Chinese and Tamil, on phones and computers."],
        ["Visitor accounts", "Sign in with Google, an e-mailed one-time code, or an e-mail address and password, with a profile page and a saved login."],
        ["Administration portal", "Staff manage content, bookings, donations, messages, reviews, subscribers and mailings, visitor statistics, photographs and videos, and backups, each in their own area."],
        ["Super administrator tools", "Create and suspend administrators, choose their areas, control the donation settings, restore backups, switch the maintenance page on, and review the activity record."],
    ],
    [4.4, 12.2],
)

# ------------------------------------------------------------------------------------------------ 7
h1("7. Working together")
table(
    ["ZeroInfinity Infotech", "Ram Mandir administration"],
    [
        ["Builds and maintains the security of the system described in this report.", "Keeps passwords and the e-mail accounts used for the portal private and safe."],
        ["Sets up and checks the server protections at launch.", "Decides who is an administrator and what each may do, and removes access promptly when someone leaves."],
        ["Provides updates and fixes when a security problem is found, and runs all the checks again after every change.", "Keeps the hosting, database, photo storage, e-mail and payment accounts under the temple’s own control."],
        ["Advises on backups, monitoring and good practice, and investigates and corrects any reported incident.", "Approves content, reviews and mailings, tells us at once about anything unusual, and decides how long visitor information is kept."],
    ],
    [8.3, 8.3],
    boldfirst=False,
)

# ------------------------------------------------------------------------------------------------ 8
h1("8. Our suggestions to the temple administration")
p("These simple habits give the temple the most protection. We are glad to help with any of them.")
ul([
    ("1. Keep the number of administrators small. ", "Give each person only the areas they need, and no shared logins."),
    ("2. Use strong, private passwords. ", "Use a long password that is not used anywhere else, and never share it, not even with us. ZeroInfinity Infotech will never ask you for a password."),
    ("3. Use two-step sign-in on the accounts around the system. ", "That means the hosting, the database, the photo storage, the temple’s e-mail and the payment accounts. We will help you switch it on."),
    ("4. Remove access the same day when someone leaves. ", "Ask us or use the portal to suspend the account at once."),
    ("5. Keep the important accounts in the temple’s own name. ", "Hosting, database, photo storage, e-mail and payment gateways should belong to the temple, with at least two trusted people who can recover them."),
    ("6. Look at the activity record every month. ", "Check that the changes made are the ones you expect, and approve or hide visitor reviews and messages promptly."),
    ("7. Be careful with unexpected messages. ", "Do not click links or give passwords in e-mails or messages you did not expect, even if they look official. Ask us if you are unsure."),
    ("8. Keep the computers and phones used for the portal up to date. ", "Install updates and use a trusted anti-virus program."),
    ("9. Check the backups with us. ", "Once every three months, we restore a recent backup into a test copy to make sure it works."),
    ("10. Plan an independent security test once a year. ", "An outside specialist tries to break in, so that new weaknesses are found early."),
    ("11. Tell us at once if something looks wrong. ", "A strange sign-in, a missing record or an unexpected message: early notice makes problems small."),
])

# ------------------------------------------------------------------------------------------------ 9
h1("9. What we will do with you at launch")
table(
    ["Step", "What we do"],
    [
        ["1. Install the new version", "Put the prepared website and system on the temple’s hosting, so that all the protections in section 3 start working on the live website."],
        ["2. Set up the server protections", "The encrypted connection, firewall, attack filter, malware scanning and protected logins in section 4."],
        ["3. Set new private keys", "Strong, new secret keys for the live website, different from any test copy, and a strong password for the super administrator."],
        ["4. Check the administrator accounts", "Make sure every administrator has a strong password and only the areas they need."],
        ["5. Test with real accounts", "Send a real test e-mail, make one small donation with each payment gateway, and upload one photograph, to be sure everything works on the live website."],
        ["6. Set up the backups", "Nightly backups with a copy kept elsewhere, and a first test restore."],
        ["7. Show your team", "A short walk-through for the administrators: signing in safely, access areas, the activity record and what to do if something looks wrong."],
    ],
    [4.4, 12.2],
)

# ------------------------------------------------------------------------------------------------ 10
h1("10. Simple words")
table(
    ["Word", "Meaning"],
    [
        ["Two-step sign-in", "Signing in with a password plus a second proof, such as a code on your phone."],
        ["Encrypted connection (HTTPS)", "The padlock in the browser. What you send and receive cannot be read by anyone in between."],
        ["Firewall", "A filter that allows only the traffic the website needs."],
        ["Malware", "Harmful programs that try to damage a system or steal information."],
        ["Activity record (audit log)", "A list of who did what and when in the administration portal."],
        ["Backup", "A safe copy of the temple’s information that can be put back if something goes wrong."],
    ],
    [5.4, 11.2],
)

# ------------------------------------------------------------------------------------------------ sign-off
B.append(("sign", dict(
    heading="11. Verification and sign-off",
    text="This report was prepared by the ZeroInfinity Infotech administration and is verified by the founder.",
    rows=[
        ("Prepared by", "ZeroInfinity Infotech — Administration"),
        ("Verified by", "Sujan Subedi, Founder, ZeroInfinity Infotech"),
    ],
)))
