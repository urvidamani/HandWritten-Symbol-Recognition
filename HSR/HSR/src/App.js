import React, { useRef, useState, useEffect } from "react";
import Tesseract from 'tesseract.js'
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelVersion, setModelVersion] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // fetchModelVersion();
  }, []);

  const fetchModelVersion = async () => {
    try {
      const response = await fetch(process.env.REACT_APP_API_URL || "http://localhost:5000/version");
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      setModelVersion(data.version);
    } catch (error) {
      console.error("Error: ", error);
      setModelVersion("unknown");
    }
  };

  const startDrawing = (e) => {
    setDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setDrawing(false);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
  };

  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 1; // Set pen size to 1 pixel
    ctx.lineCap = "square"; // Use square line cap for pen-like drawing
    ctx.strokeStyle = "black";

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY
    );
  };

  const handleProceedClick = async () => {
    setLoading(true);
    const base64Image = getBase64Image();
    try {
      const response = await fetch(process.env.REACT_APP_API_URL ||"http://localhost:5000/classify", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      setPrediction(data.result);
      setSelectedSymbol(data.result);
      setShowSave(true);
    } catch (error) {
      console.error("Error: ", error);
      setPrediction("Error occurred while processing image");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClick = async () => {
    setLoading(true);
    const base64Image = getBase64Image();
    try {
      const response = await fetch( process.env.REACT_APP_API_URL || "http://localhost:5000/save", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ image: base64Image, symbol: selectedSymbol }),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      alert("Image saved successfully!");
    } catch (error) {
      console.error("Error: ", error);
      alert("Error occurred while saving image");
    } finally {
      setLoading(false);
    }
  };

  const handleClearClick = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPrediction(null);
    setShowSave(false);
  };

  const handleHelpClick = () => {
    setShowHelp(true);
  };

  const handleCloseClick = () => {
    setShowHelp(false);
  };

  const handleTrainClick = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.REACT_APP_API_URL ||"http://localhost:5000/retrain", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      alert("Model retrained and updated successfully!");
      setModelVersion(data.version);
    } catch (error) {
      console.error("Error: ", error);
      alert("Error occurred while retraining the model");
    } finally {
      setLoading(false);
    }
  };

  const getBase64Image = () => {
    const canvas = canvasRef.current;
    const base64 = canvas.toDataURL("image/png");

  
  Tesseract.recognize(base64, 'eng')
    .then(({ data: { text } }) => {
      console.log("Recognized text:", text);
    })
    .catch(err => {
      console.error("OCR Error:", err);
    });
    return canvas.toDataURL("image/png").split(",")[1];
  };

  return (
    <div className="container">
      {loading && <div className="loading">Loading...</div>}
      {/* <div className="version-container">Model Version: {modelVersion}</div> */}
      <canvas
        ref={canvasRef}
        width="45"
        height="45"
        style={{ marginTop:"20px",padding:"20px",width: "200px", height: "200px", border: "1px solid black" }}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        disabled={loading}
      ></canvas>
      <div className="button-container">
        <button onClick={handleProceedClick} disabled={loading}>
          Proceed
        </button>
        <button onClick={handleClearClick} disabled={loading}>
          Clear
        </button>
        <button onClick={handleHelpClick} disabled={loading}>
          Help
        </button>
      </div>
      {prediction != null && (
        <div className="output-container">Symbol is: {prediction}</div>
      )}
      {/* {showSave && (
        <div className="save-container">
          <div className="prompt-box">
            <p>
              Was it correct? If not, select the correct symbol and click save
              to add to training data.
            </p>
            <div className="dropdown-wrapper">
              <label htmlFor="symbol-select">Select Symbol: </label>
              <select
                id="symbol-select"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                disabled={loading}
              >
                <option value="">--Select--</option>
                <option value="+">Addition</option>
                <option value="-">Subtraction</option>
                <option value="div">division(/)</option>
                <option value="beta">beta</option>
                <option value="0">0</option>
                <option value="sin">sin</option>
                <option value="cos">cos</option>
              </select>
            </div>
            <button
              onClick={handleSaveClick}
              disabled={!selectedSymbol || loading}
            >
              Save
            </button>
            <p className="train-info">
              You can retrain the model to improve accuracy with the latest
              data. This is recommended after adding a significant number of new
              samples.
            </p>
            <button onClick={handleTrainClick} disabled={loading}>
              Re-Train Model
            </button>
          </div>
        </div>
      )} */}
      {showHelp && (
        <div className="popup">
          <div className="popup-content">
            <span className="close-button" onClick={handleCloseClick}>
              &times;
            </span>
            <table>
              <thead>
                <tr>
                  <th>Symbols You can draw</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Addition</td>
                </tr>
                <tr>
                  <td>Subtraction</td>
                </tr>
                <tr>
                  <td>division</td>
                </tr>
                <tr>
                  <td>beta</td>
                </tr>
                <tr>
                  <td>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
