"""
Generate VocabBuilder extension icons as PNG files.
Uses only built-in Python libraries (struct, zlib) to create valid PNGs.
"""

import struct
import zlib
import math
import os

def create_png(width, height, pixels):
    """Create PNG from RGBA pixel array."""
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        c += struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
        return c

    # IHDR
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)

    # Image data - RGB (no alpha for simplicity)
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter type none
        for x in range(width):
            r, g, b = pixels[y][x]
            raw += bytes([r, g, b])

    compressed = zlib.compress(raw, 9)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png


def lerp(a, b, t):
    return a + (b - a) * t


def draw_icon(size):
    """Draw the VocabBuilder icon at the given size."""
    pixels = [[(15, 17, 23)] * size for _ in range(size)]

    cx, cy = size / 2, size / 2
    r = size / 2 - 1

    # Background circle gradient
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            if dist <= r:
                t = (x / size + y / size) / 2
                # Gradient: #4f8ef7 -> #2d5fcf
                rv = int(lerp(0x4f, 0x2d, t))
                gv = int(lerp(0x8e, 0x5f, t))
                bv = int(lerp(0xf7, 0xcf, t))
                pixels[y][x] = (rv, gv, bv)

    # Draw book lines (white)
    def draw_line(x1, y1, x2, y2, color, thickness=1):
        steps = max(abs(x2-x1), abs(y2-y1), 1) * 4
        for i in range(steps + 1):
            t = i / steps
            px = int(x1 + (x2 - x1) * t)
            py = int(y1 + (y2 - y1) * t)
            for dy in range(-thickness, thickness + 1):
                for dx in range(-thickness, thickness + 1):
                    nx, ny = px + dx, py + dy
                    if 0 <= nx < size and 0 <= ny < size:
                        pixels[ny][nx] = color

    def draw_circle_dot(cx2, cy2, r2, color):
        for y in range(size):
            for x in range(size):
                dx = x - cx2
                dy = y - cy2
                if math.sqrt(dx*dx + dy*dy) <= r2:
                    pixels[y][x] = color

    w = size
    # Scale factor
    s = size / 32

    # Book spine / pages (simplified lines)
    white = (255, 255, 255)
    light_blue = (200, 220, 255)
    orange = (255, 200, 80)

    t = max(0, int(s * 0.7) - 1)

    # Lines representing text on book page
    lines = [
        (7, 10, 18, 10),
        (7, 14, 16, 14),
        (7, 18, 14, 18),
    ]
    for (x1, y1, x2, y2) in lines:
        draw_line(int(x1*s), int(y1*s), int(x2*s), int(y2*s), white, t)

    # Circle for lightbulb
    draw_circle_dot(int(22*s), int(13*s), int(4.5*s), (255, 220, 100))
    draw_circle_dot(int(22*s), int(13*s), int(3.5*s), orange)

    # Lightbulb ray lines
    rays = [
        (22, 8, 22, 6),   # top
        (26, 10, 28, 8),  # top-right
        (27, 14, 30, 14), # right
        (18, 10, 16, 8),  # top-left
    ]
    for (x1, y1, x2, y2) in rays:
        draw_line(int(x1*s), int(y1*s), int(x2*s), int(y2*s), orange, t)

    return pixels


def save_icon(size, path):
    pixels = draw_icon(size)
    data = create_png(size, size, pixels)
    with open(path, 'wb') as f:
        f.write(data)
    print(f"Created {path} ({size}x{size})")


if __name__ == '__main__':
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    save_icon(16,  os.path.join(icons_dir, 'icon16.png'))
    save_icon(48,  os.path.join(icons_dir, 'icon48.png'))
    save_icon(128, os.path.join(icons_dir, 'icon128.png'))
    print("All icons generated successfully!")
