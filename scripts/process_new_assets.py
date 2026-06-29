#!/usr/bin/env python3
import os
from PIL import Image

# Source files from the artifact directory
src_dir = "/Users/turbileg/.gemini/antigravity/brain/77cbbbec-77dd-43d4-8270-30c6d0a498a8"
dst_dir = "/Users/turbileg/Muushig/packages/client/public/assets"

os.makedirs(dst_dir, exist_ok=True)

assets_map = {
    "room_clean_1782406056970.png": ("room.webp", "webp"),
    "table_felt_1782406084147.png": ("table.png", "png_trans"),
    "placard_1782406098570.png": ("placard.png", "png_trans"),
    "placard_you_1782406112222.png": ("placard-you.png", "png_trans"),
    "coin_stack_1782406145166.png": ("coin-stack.png", "png_trans"),
    "logo_frame_1782406159719.png": ("logo-frame.png", "png_trans"),
    "medallion_active_1782406177650.png": ("medallion-active.png", "png_trans"),
    "medallion_inactive_1782406193769.png": ("medallion-inactive.png", "png_trans"),
    "scroll_strip_1782406211748.png": ("scroll-strip.png", "png_trans"),
    "message_panel_1782406229849.png": ("message-panel.png", "png_trans"),
    "draw_pile_1782406250253.png": ("draw-pile.png", "png_trans"),
}

def make_transparent(img, threshold=245):
    img = img.convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # Check if the pixel is near-white
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    return img

def process_general_assets():
    for src_name, (dst_name, mode) in assets_map.items():
        src_path = os.path.join(src_dir, src_name)
        dst_path = os.path.join(dst_dir, dst_name)
        
        if not os.path.exists(src_path):
            print(f"Source file not found: {src_path}")
            continue
            
        print(f"Processing {src_name} -> {dst_name} ({mode})")
        img = Image.open(src_path)
        
        if mode == "webp":
            # Convert to WebP
            img.save(dst_path, "WEBP", quality=85)
        elif mode == "png_trans":
            # Make transparent and save as PNG
            trans_img = make_transparent(img)
            trans_img.save(dst_path, "PNG")

def slice_seat_tokens():
    src_path = os.path.join(src_dir, "seat_tokens_1782406127978.png")
    if not os.path.exists(src_path):
        print(f"Seat tokens sheet not found: {src_path}")
        return
        
    print("Slicing seat tokens sheet...")
    img = Image.open(src_path)
    # The sheet is a 2x3 grid (3 columns, 2 rows)
    width, height = img.size
    col_width = width // 3
    row_height = height // 2
    
    token_names = ["seat-1.png", "seat-2.png", "seat-3.png", "seat-4.png", "seat-5.png", "seat-6.png"]
    
    token_idx = 0
    for r in range(2):
        for c in range(3):
            # Crop the cell
            box = (c * col_width, r * row_height, (c + 1) * col_width, (r + 1) * row_height)
            cell = img.crop(box)
            
            # Make transparent
            trans_cell = make_transparent(cell)
            
            # Resize to 256x256 if needed
            trans_cell = trans_cell.resize((256, 256), Image.Resampling.LANCZOS)
            
            dst_name = token_names[token_idx]
            dst_path = os.path.join(dst_dir, dst_name)
            trans_cell.save(dst_path, "PNG")
            print(f"  Saved sliced token: {dst_name}")
            token_idx += 1

if __name__ == "__main__":
    process_general_assets()
    slice_seat_tokens()
    print("Asset processing complete!")
