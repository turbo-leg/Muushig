#!/usr/bin/env python3
import os
from PIL import Image

src_dir = "/Users/turbileg/.gemini/antigravity/brain/77cbbbec-77dd-43d4-8270-30c6d0a498a8"
dst_dir = "/Users/turbileg/Muushig/packages/client/public/assets"

assets = {
    "placard_rect_1782408132412.png": "placard.png",
    "placard_you_rect_1782408177270.png": "placard-you.png"
}

def make_transparent(img, threshold=245):
    img = img.convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    return img

for src_name, dst_name in assets.items():
    src_path = os.path.join(src_dir, src_name)
    dst_path = os.path.join(dst_dir, dst_name)
    
    if not os.path.exists(src_path):
        print(f"File not found: {src_path}")
        continue
        
    print(f"Processing {src_name} -> {dst_name}")
    img = Image.open(src_path)
    trans_img = make_transparent(img)
    trans_img.save(dst_path, "PNG")

print("Placard processing complete!")
