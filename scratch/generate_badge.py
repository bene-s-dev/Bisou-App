import os
from PIL import Image, ImageDraw, ImageFont

def main():
    public_dir = "/Users/benedikt/Desktop/CB App/public"
    output_path = os.path.join(public_dir, "badge.png")

    # Create 96x96 transparent RGBA image
    img = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Use Georgia font to match the serif style of the app
    font_paths = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Supplemental/Baskerville.ttc"
    ]

    font = None
    font_size = 72  # Font size chosen to fit perfectly inside 96x96 px

    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, font_size)
                print(f"Using font: {fp}")
                break
            except Exception as e:
                print(f"Error loading {fp}: {e}")

    if not font:
        print("Fallback to default font")
        font = ImageFont.load_default()

    # Calculate centered position using textbbox (Pillow 10+)
    bbox = draw.textbbox((0, 0), "B", font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]

    # Center the character "B"
    x = (96 - w) / 2 - bbox[0]
    y = (96 - h) / 2 - bbox[1]

    # Draw solid white letter "B"
    draw.text((x, y), "B", fill=(255, 255, 255, 255), font=font)

    # Save as PNG
    img.save(output_path, "PNG")
    print(f"Successfully saved transparent white badge.png to {output_path}")

if __name__ == '__main__':
    main()
