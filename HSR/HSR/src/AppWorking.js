import React, { useRef, useState, useEffect } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

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
    ctx.lineCap = "round"; // Use round line cap for pen-like drawing
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
    const base64Image = getBase64Image();
    try {
      const response = await fetch("http://localhost:5000/classify", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      setPrediction(data.result);
    } catch (error) {
      console.error("Error: ", error);
      setPrediction("Error occurred while processing image");
    }
  };

  const handleClearClick = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPrediction(null);
  };

  const handleHelpClick = () => {
    setShowHelp(true);
  };

  const handleCloseClick = () => {
    setShowHelp(false);
  };

  const getBase64Image = () => {
    const canvas = canvasRef.current;
    return canvas.toDataURL("image/png").split(",")[1];
  };

  return (
    <div className="container">
      <canvas
        ref={canvasRef}
        width="45"
        height="45"
        style={{ width: "200px", height: "200px", border: "1px solid black" }}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
      ></canvas>
      <div className="button-container">
        <button onClick={handleProceedClick}>Proceed</button>
        <button onClick={handleClearClick}>Clear</button>
        <button onClick={handleHelpClick}>Help</button>
      </div>
      {prediction != null && (
        <div className="output-container">Symbol is: {prediction}</div>
      )}
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
                  <td>+</td>
                </tr>
                <tr>
                  <td>0-9</td>
                </tr>
                <tr>
                  <td>-</td>
                </tr>
                <tr>
                  <td>=</td>
                </tr>
                <tr>
                  <td>pi</td>
                </tr>
                <tr>
                  <td>cos</td>
                </tr>
                <tr>
                  <td>tan</td>
                </tr>
                <tr>
                  <td>sin</td>
                </tr>
                <tr>
                  <td>div</td>
                </tr>
                <tr>
                  <td>alpha</td>
                </tr>
                <tr>
                  <td>theta</td>
                </tr>
                <tr>
                  <td>beta</td>
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
