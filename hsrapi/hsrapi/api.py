import base64
import io
import os
import pickle
import shutil
from datetime import datetime

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageOps
from skimage.feature import hog
from sklearn import svm
from sklearn.model_selection import train_test_split

app = Flask(__name__)
CORS(app)

script_dir = os.path.dirname(os.path.abspath(__file__))
model_dir = os.path.join(script_dir, "models")
archive_dir = os.path.join(model_dir, "archive")


def find_model_file():
    model_files = [
        f
        for f in os.listdir(model_dir)
        if f.startswith("model_") and f.endswith(".pkl")
    ]
    if len(model_files) == 1:
        return os.path.join(model_dir, model_files[0])
    elif len(model_files) > 1:
        raise FileExistsError("Multiple model files found in the models directory.")
    else:
        raise FileNotFoundError("No model file found in the models directory.")


model_path = find_model_file()
with open(model_path, "rb") as f:
    model = pickle.load(f)

dictionary_path = os.path.join(script_dir, "flattened_images_dict.pkl")
with open(dictionary_path, "rb") as f:
    flattened_images_dict = pickle.load(f)

data_dir = os.path.join(script_dir, "data")  # Directory to save images


def decode_image(b64_string):
    try:
        img_bytes = base64.b64decode(b64_string)
        img = Image.open(io.BytesIO(img_bytes))
        return img
    except Exception as e:
        raise ValueError("Invalid image data")


def preprocess_image(img):
    img = ImageOps.grayscale(img)
    img = img.resize((45, 45))
    img_array = np.array(img)
    return hog(
        image=img_array,
        orientations=9,
        pixels_per_cell=(10, 10),
        cells_per_block=(2, 2),
        transform_sqrt=True,
        block_norm="L2-Hys",
    ).reshape(1, -1)


def save_image(img, symbol):
    symbol_dir = os.path.join(data_dir, symbol)
    if not os.path.exists(symbol_dir):
        os.makedirs(symbol_dir)
    files = os.listdir(symbol_dir)
    file_count = len(files)
    filename = f"{file_count + 1}.png"
    img_path = os.path.join(symbol_dir, filename)
    img.save(img_path)


def load_data(data_dir):
    symbol_list = ["Addition", "Subtraction", "div", "beta", "0","sin","cos"]
    flattened_images_dict = {}
    Flattened_images = []
    label = []

    for index, symbol in enumerate(symbol_list):
        image_directory = os.path.join(data_dir, symbol)
        for filename in os.listdir(image_directory):
            img = Image.open(os.path.join(image_directory, filename))
            img = ImageOps.grayscale(img)
            img = img.resize((45, 45))
            img_array = np.array(img)
            img_flatten = img_array.flatten()
            Flattened_images.append(img_flatten)
            if index not in flattened_images_dict:
                flattened_images_dict[index] = symbol
            label.append(index)

    return np.array(Flattened_images), np.array(label), flattened_images_dict


@app.route("/classify", methods=["POST"])
def classify_image():
    try:
        data = request.json
        if "image" not in data:
            return jsonify({"error": "No image provided"}), 400
        b64_string = data["image"]
        img = decode_image(b64_string)
        img_array = preprocess_image(img)
        prediction = model.predict(img_array)
        predicted_class_index = prediction[0]
        predicted_class = flattened_images_dict[predicted_class_index]
        return jsonify({"result": str(predicted_class)})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "An error occurred while processing the image"}), 500


@app.route("/save", methods=["POST"])
def save_image_endpoint():
    try:
        data = request.json
        if "image" not in data or "symbol" not in data:
            return jsonify({"error": "Image or symbol not provided"}), 400
        b64_string = data["image"]
        symbol = data["symbol"]
        img = decode_image(b64_string)
        save_image(img, symbol)
        return jsonify({"message": "Image saved successfully!"})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "An error occurred while saving the image"}), 500


@app.route("/retrain", methods=["POST"])
def retrain_model():
    try:
        Flattened_images, label, new_flattened_images_dict = load_data(data_dir)

        # Save the current data arrays before retraining
        np.save(os.path.join(script_dir, "flattened_images.npy"), Flattened_images)
        np.save(os.path.join(script_dir, "label.npy"), label)
        with open(os.path.join(script_dir, "flattened_images_dict.pkl"), "wb") as f:
            pickle.dump(new_flattened_images_dict, f)

        X_train, X_test, y_train, y_test = train_test_split(
            Flattened_images, label, test_size=0.2, random_state=42
        )
        X_train_hog = np.array(
            [
                hog(
                    x.reshape(45, 45),
                    orientations=9,
                    pixels_per_cell=(10, 10),
                    cells_per_block=(2, 2),
                    transform_sqrt=True,
                    block_norm="L2-Hys",
                )
                for x in X_train
            ]
        )
        X_test_hog = np.array(
            [
                hog(
                    x.reshape(45, 45),
                    orientations=9,
                    pixels_per_cell=(10, 10),
                    cells_per_block=(2, 2),
                    transform_sqrt=True,
                    block_norm="L2-Hys",
                )
                for x in X_test
            ]
        )
        print("training...")
        new_model = svm.SVC(kernel="rbf", C=100)
        new_model.fit(X_train_hog, y_train)
        print("testing...")
        print(f"score: {new_model.score(X_test_hog, y_test)}")
        if not os.path.exists(archive_dir):
            os.makedirs(archive_dir)

        # Get current datetime for versioning
        version = datetime.now().strftime("%Y%m%d%H%M%S")

        # Move the current model to the archive folder
        shutil.move(model_path, os.path.join(archive_dir, os.path.basename(model_path)))

        # Save the new model with the version as part of the filename
        new_model_path = os.path.join(model_dir, f"model_{version}.pkl")
        with open(new_model_path, "wb") as f:
            pickle.dump(new_model, f)

        global model
        model = new_model

        return jsonify(
            {"message": "Model retrained and updated successfully!", "version": version}
        )
    except Exception as e:
        return jsonify({"error": "An error occurred while retraining the model"}), 500


@app.route("/version", methods=["GET"])
def get_version():
    try:
        model_files = [
            f
            for f in os.listdir(model_dir)
            if f.startswith("model_") and f.endswith(".pkl")
        ]
        if len(model_files) != 1:
            return jsonify({"version": "unknown"})
        latest_model_file = model_files[0]
        version = latest_model_file.split("_")[1].split(".")[0]
        return jsonify({"version": version})
    except Exception as e:
        return jsonify({"error": "An error occurred while retrieving the version"}), 500


if __name__ == "__main__":
    app.run(debug=True)
