import React, { useState } from 'react';
import "./styles.css";
import * as tf from "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton } from "./utilities";
export default function App() {

  const [shoulderSlope,setShoulderSlope]  = useState(0);
  const [headSlope,setHeadSlope]  = useState(0);

  const webcamRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const storedPose = {};

  const detectWebcamFeed = async (posenet_model) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;
      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;
      // Make Estimation
      const pose = await posenet_model.estimateSinglePose(video);
      var leftS = pose["keypoints"][5]["position"]
      var rightS = pose["keypoints"][6]["position"]
      // console.log(leftS)
      var shoulderSlope = (rightS['y'] - leftS['y'])/(rightS['x'] - leftS['x'])
      // console.log(slope)
      setShoulderSlope(Math.round(shoulderSlope*100)/100)
      
      var leftEar = pose["keypoints"][3]["position"]
      var rightEar = pose["keypoints"][4]["position"]
      var headSlope = (rightEar['y'] - leftEar['y'])/(rightEar['x'] - leftEar['x'])
      setHeadSlope(Math.round(headSlope*100)/100)

      drawResult(pose, video, videoWidth, videoHeight, canvasRef);
    
    }
  };
  const runPosenet = async () => {
    const posenet_model = await posenet.load({
      inputResolution: { width: 640, height: 480 },
      scale: 0.8
    });
    //
    setInterval(() => {
      detectWebcamFeed(posenet_model);
    },1500);
  };
  runPosenet();
  //calculate shoulder slope
  const drawResult = (pose, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext("2d");
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;
    drawKeypoints(pose["keypoints"], 0.3, ctx);
    drawSkeleton(pose["keypoints"], 0.3, ctx);
  };

  
  return (
    <div className="App">
      <header className="App-header">
      <p>shoulder tilt {shoulderSlope}</p>
      <p>head tilt {headSlope}</p>

        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480
          }}
        />

      </header>

    </div>
  );
}
