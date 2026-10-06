# -*- coding: utf-8 -*-
"""Draws the 'three layers of protection' picture (SVG) and prints it to PNG with headless Chrome."""
import os, subprocess, sys, tempfile
OUT = os.path.abspath(sys.argv[1])
NAVY, BLUE, GREY, LINE, SOFT, GREEN = "#0B1F3A", "#1F6FEB", "#555F6D", "#C9D3E3", "#EEF2F8", "#E6F4EA"
F = "font-family=\"Calibri, 'Segoe UI', Arial, sans-serif\""

p = ['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="430" viewBox="0 0 1000 430">',
     f'<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{BLUE}"/></marker></defs>',
     '<rect width="1000" height="430" fill="#FFFFFF"/>']

# who is protected
p.append(f'<rect x="250" y="10" width="500" height="46" rx="23" fill="{SOFT}" stroke="{LINE}" stroke-width="1.5"/>')
p.append(f'<text x="500" y="39" text-anchor="middle" {F} font-size="17" font-weight="700" fill="{NAVY}">Devotees, visitors and temple administrators</text>')
p.append(f'<line x1="500" y1="58" x2="500" y2="84" stroke="{BLUE}" stroke-width="2" marker-end="url(#a)"/>')

cards = [
    ("1", "The software", ["Safe sign-in and passwords", "Access only to what each person needs", "Safe payments, forms and uploads", "Safe e-mail, privacy and records"]),
    ("2", "The hosting server", ["Encrypted connection (padlock)", "Firewall and attack filter", "Malware scanning", "Private files kept private"]),
    ("3", "People and routine", ["Two-step sign-in for administrators", "Updates and monitoring", "Checks after every change", "A yearly independent test"]),
]
for i, (num, title, items) in enumerate(cards):
    x = 20 + i * 330
    p.append(f'<rect x="{x}" y="92" width="300" height="236" rx="14" fill="#FFFFFF" stroke="{BLUE}" stroke-width="2"/>')
    p.append(f'<path d="M{x},106 a14,14 0 0 1 14,-14 h272 a14,14 0 0 1 14,14 v34 h-300 z" fill="{BLUE}"/>')
    p.append(f'<circle cx="{x + 30}" cy="116" r="15" fill="#FFFFFF"/><text x="{x + 30}" y="122" text-anchor="middle" {F} font-size="17" font-weight="700" fill="{BLUE}">{num}</text>')
    p.append(f'<text x="{x + 56}" y="123" {F} font-size="19" font-weight="700" fill="#FFFFFF">{title}</text>')
    for j, it in enumerate(items):
        y = 176 + j * 36
        p.append(f'<circle cx="{x + 28}" cy="{y - 5}" r="9" fill="{GREEN}" stroke="#9BD3AE"/><path d="M{x + 23.5},{y - 5} l3.2,3.4 l6,-6.6" fill="none" stroke="#1B6E3A" stroke-width="2"/>')
        p.append(f'<text x="{x + 46}" y="{y}" {F} font-size="14.5" fill="{NAVY}">{it}</text>')

# base
p.append(f'<line x1="500" y1="330" x2="500" y2="354" stroke="{BLUE}" stroke-width="2" marker-end="url(#a)"/>')
p.append(f'<rect x="20" y="360" width="960" height="52" rx="14" fill="{NAVY}"/>')
p.append(f'<text x="500" y="392" text-anchor="middle" {F} font-size="17" font-weight="700" fill="#FFFFFF">Backups and recovery: a safe copy of the temple\u2019s information is always kept</text>')
p.append('</svg>')

svg_path = os.path.join(OUT, "layers.svg")
open(svg_path, "w", encoding="utf-8").write("".join(p))
png_path = os.path.join(OUT, "layers.png")
subprocess.run(["C:/Program Files/Google/Chrome/Application/chrome.exe", "--headless=new", "--disable-gpu", "--hide-scrollbars",
                f"--user-data-dir={tempfile.mkdtemp()}", "--window-size=1000,430", "--force-device-scale-factor=2",
                f"--screenshot={png_path}", "file:///" + svg_path.replace("\\", "/")], check=True, timeout=90, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("diagram", os.path.getsize(png_path))
