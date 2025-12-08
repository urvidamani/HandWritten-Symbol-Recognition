import os
import pickle

import numpy as np
from PIL import Image

# Load the array from the file
Flattened_images = np.load("flattened_images.npy")

# Load the array from the file
label = np.load("label.npy")

# Load the dictionary from the file
with open("flattened_images_dict.pkl", "rb") as file:
    flattened_images_dict = pickle.load(file)

data_dir = "data"  # Directory to save images


def ensure_dir_exists(path):
    if not os.path.exists(path):
        os.makedirs(path)


def save_image_from_flattened(image_array, label, index):
    symbol = flattened_images_dict[label]
    symbol_dir = os.path.join(data_dir, symbol)
    ensure_dir_exists(symbol_dir)

    # Reshape the flattened image array back to 45x45
    image_array = image_array.reshape(45, 45)

    # Convert the numpy array to a PIL Image
    img = Image.fromarray(image_array.astype("uint8"), "L")

    # Determine the filename
    filename = f"{index + 1}.png"

    # Save the image
    img_path = os.path.join(symbol_dir, filename)
    img.save(img_path)


# Save images to respective class folders
for index, (image_array, lbl) in enumerate(zip(Flattened_images, label)):
    save_image_from_flattened(image_array, lbl, index)

print("Images saved successfully!")
