from PIL import Image
import os

LOGO_PATH = r"C:\wamp64\www\Nengoo-app-web\frontend\public\icons\logo-512x512.png"
RES_DIR   = r"C:\wamp64\www\Nengoo-app-web\frontend\android\app\src\main\res"
BG_COLOR  = (139, 92, 246, 255)  # #8B5CF6 violet Nengoo

# --- Splash PNGs (fond violet + logo centré) ---
SIZES = [
    ("drawable",              1080, 1920, 400),
    ("drawable-port-mdpi",     320,  480, 120),
    ("drawable-port-hdpi",     480,  800, 180),
    ("drawable-port-xhdpi",    720, 1280, 270),
    ("drawable-port-xxhdpi",   960, 1600, 360),
    ("drawable-port-xxxhdpi", 1280, 1920, 480),
    ("drawable-land-mdpi",     480,  320, 120),
    ("drawable-land-hdpi",     800,  480, 180),
    ("drawable-land-xhdpi",   1280,  720, 270),
    ("drawable-land-xxhdpi",  1600,  960, 360),
    ("drawable-land-xxxhdpi", 1920, 1280, 480),
]

logo = Image.open(LOGO_PATH).convert("RGBA")

for folder, w, h, logo_size in SIZES:
    img = Image.new("RGBA", (w, h), BG_COLOR)
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    x = (w - logo_size) // 2
    y = (h - logo_size) // 2
    img.paste(logo_resized, (x, y), logo_resized)
    out_path = os.path.join(RES_DIR, folder, "splash.png")
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    print("splash OK " + folder)

# --- Icône splash Android 12+ (transparente avec logo réduit + padding) ---
# Android clippe en cercle : zone sûre ~66% du diamètre
# On place le logo à 50% de la canvas avec fond transparent
ICON_SIZE = 512
logo_inner = int(ICON_SIZE * 0.50)  # logo occupe 50% -> reste dans le cercle

icon_canvas = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
logo_for_icon = logo.resize((logo_inner, logo_inner), Image.LANCZOS)
x = (ICON_SIZE - logo_inner) // 2
y = (ICON_SIZE - logo_inner) // 2
icon_canvas.paste(logo_for_icon, (x, y), logo_for_icon)
icon_path = os.path.join(RES_DIR, "drawable", "nengoo_icon.png")
icon_canvas.save(icon_path, "PNG")
print("nengoo_icon.png genere (512x512, logo 50%, transparent)")

print("Termine !")
