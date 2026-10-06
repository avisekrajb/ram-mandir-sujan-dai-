# -*- coding: utf-8 -*-
"""Draws the architecture picture (SVG) and prints it to PNG with headless Chrome."""
import os, subprocess, sys, tempfile
OUT = os.path.abspath(sys.argv[1])
NAVY, BLUE, GREY, LINE, SOFT, GREEN = "#0B1F3A", "#1F6FEB", "#555F6D", "#C9D3E3", "#EEF2F8", "#E6F4EA"
F = "font-family=\"Calibri, 'Segoe UI', Arial, sans-serif\""

def box(x, y, w, h, title, lines=(), fill="#FFFFFF", stroke=LINE, tsize=15, lsize=12, sw=1.5):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    s += f'<text x="{x + 14}" y="{y + 24}" {F} font-size="{tsize}" font-weight="700" fill="{NAVY}">{title}</text>'
    for i, ln in enumerate(lines):
        s += f'<text x="{x + 14}" y="{y + 44 + i * 17}" {F} font-size="{lsize}" fill="{GREY}">{ln}</text>'
    return s

def arrow(x1, y1, x2, y2, color=BLUE):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2" marker-end="url(#a)"/>'

def chip(x, y, w, text):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="22" rx="11" fill="{GREEN}" stroke="#9BD3AE"/>'
            f'<text x="{x + w / 2}" y="{y + 15}" text-anchor="middle" {F} font-size="11" font-weight="700" fill="#1B6E3A">{text}</text>')

p = []
p.append('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560">')
p.append(f'<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{BLUE}"/></marker></defs>')
p.append('<rect width="1000" height="560" fill="#FFFFFF"/>')

# left: people
p.append(box(20, 70, 190, 92, "Devotees and visitors", ["Phone or computer", "No account needed to read"], fill=SOFT))
p.append(box(20, 200, 190, 92, "Temple administrators", ["Admin portal, signed in", "Only the areas they are given"], fill=SOFT))
p.append(arrow(210, 116, 258, 116)); p.append(arrow(210, 246, 258, 246))
p.append(f'<text x="234" y="104" text-anchor="middle" {F} font-size="10" font-weight="700" fill="{BLUE}">HTTPS</text>')
p.append(f'<text x="234" y="234" text-anchor="middle" {F} font-size="10" font-weight="700" fill="{BLUE}">HTTPS</text>')

# middle: the cPanel server
p.append(f'<rect x="260" y="20" width="400" height="520" rx="14" fill="#F7F9FC" stroke="{BLUE}" stroke-width="2"/>')
p.append(f'<text x="280" y="50" {F} font-size="18" font-weight="700" fill="{NAVY}">cPanel hosting server</text>')
p.append(f'<text x="280" y="70" {F} font-size="12" fill="{GREY}">Everything below runs behind the server\u2019s protections</text>')
p.append(chip(280, 82, 80, "Firewall") + chip(366, 82, 124, "Web app firewall") + chip(496, 82, 106, "Malware scan") + chip(280, 110, 118, "Free SSL (HTTPS)"))
p.append(box(280, 146, 360, 92, "Website", ["Pages visitors see, in 5 languages", "Static files in public_html with .htaccess", "(HTTPS, page routing, protection headers)"]))
p.append(arrow(460, 238, 460, 266))
p.append(f'<text x="470" y="256" {F} font-size="10" fill="{GREY}">asks the API</text>')
p.append(box(280, 268, 360, 118, "Temple API (Node.js application)", ["Sign-in, access areas, rate limits, input checks", "Payments check, e-mail, audit log, background mailings", "Own sub-domain; runs as the account\u2019s own user"], fill="#FFFFFF", stroke=BLUE, sw=2))
p.append(box(280, 408, 360, 112, "Backups and logs", ["Nightly account backup, copy kept off-server", "Settings and keys stored outside the public folder", "Logs reviewed every week"]))

# right: outside services
svc = [
    ("MongoDB Atlas", ["Database: content, bookings,", "donations, accounts"]),
    ("Cloudinary", ["Photographs and videos"]),
    ("eSewa, Khalti, ConnectIPS", ["Payments, confirmed by the", "server with each gateway"]),
    ("E-mail (SMTP)", ["Confirmations, newsletter,", "reminders, sign-in codes"]),
    ("Google sign-in", ["Identity checked with Google"]),
    ("Public data", ["Patro calendar, weather,", "exchange rates, Facebook live"]),
]
for i, (t, ls) in enumerate(svc):
    y = 28 + i * 87
    p.append(box(730, y, 250, 72, t, ls, fill="#FFFFFF"))
    p.append(arrow(640, 327, 728, y + 36))
p.append('</svg>')

svg_path = os.path.join(OUT, "architecture.svg")
open(svg_path, "w", encoding="utf-8").write("".join(p))
png_path = os.path.join(OUT, "architecture.png")
subprocess.run(["C:/Program Files/Google/Chrome/Application/chrome.exe", "--headless=new", "--disable-gpu", "--hide-scrollbars",
                f"--user-data-dir={tempfile.mkdtemp()}", "--window-size=1000,560", "--force-device-scale-factor=2",
                f"--screenshot={png_path}", "file:///" + svg_path.replace("\\", "/")], check=True, timeout=90, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("diagram", os.path.getsize(png_path))
