import React, { useEffect, useState } from 'react';
import "./styles.css";
// import * as tf from "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton } from "./utilities";
import useSound from 'use-sound';
import sound from './sounds/effect.mp3';

// or less ideally
import { Button } from 'react-bootstrap';
export default function App() {

  const bounds = .1;
  const [shoulderSlope, setShoulderSlope] = useState(0);
  const [headSlope, setHeadSlope] = useState(0);
  const [count, setCount] = useState(0);
  const [shoulderY, setShoulderY] = useState(0)
  const [play] = useSound(sound);
  const [intervalCount, setIntervalCount] = useState(0);
  const [setPrefs, setSetPrefs] = useState(false)
  const webcamRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // const storedPose = {};

  const detectWebcamFeed = async (posenet_model) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      setCount(new Date().getSeconds())
      console.log("runnig")

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
      var shoulderSlope = (rightS['y'] - leftS['y']) / (rightS['x'] - leftS['x'])
      // console.log(slope)
      var shouldY = (rightS['y'] + leftS['y'])/2
      if((shoulderY - shouldY) > 50){
        console.log("slouching")
        
      }

      console.log(setPrefs)
      setShoulderSlope(Math.round(shoulderSlope * 100) / 100)

      var leftEar = pose["keypoints"][3]["position"]
      var rightEar = pose["keypoints"][4]["position"]
      var headSlope = (rightEar['y'] - leftEar['y']) / (rightEar['x'] - leftEar['x'])
      setHeadSlope(Math.round(headSlope * 100) / 100)
      if (Math.abs(shoulderSlope) > bounds || Math.abs(headSlope) > bounds) {
        console.log("increasing count " + intervalCount)
        setCount(10)
        console.log("new count " + intervalCount)

      }
      play()
      console.log("interval count is " + count)
      if (count > 2) {
        console.log("PLAYING SOUND")
        setCount(0);
      }


      drawResult(pose, video, videoWidth, videoHeight, canvasRef);

    }
  };




  const changeSetPrefs  = () => {
    setSetPrefs(true)
  }

  // useEffect(() => {

  // },[])
  const runPosenet = async () => {
    const posenet_model = await posenet.load({
      inputResolution: { width: 640, height: 480 },
      scale: 0.8
    });
    //

    return posenet_model;
  };
  var model;

  runPosenet().then((posenet_model) => {
    model = posenet_model;
  });


  useEffect(() => {
    setInterval(() => {
      // setHeadSlope(2)
      detectWebcamFeed(model);
    }, 4500);

  }, []);
  


  //calculate shoulder slope
  const drawResult = (pose, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext("2d");
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;
    drawKeypoints(pose["keypoints"], .1, ctx);
    drawSkeleton(pose["keypoints"], 0.1, ctx);
  };


  return (
    <div className="App" style={{ background: "#EAEDED", borderRadius: "10px", padding: "10px", maxWidth: "800px", margin: "auto", marginTop: "10px" }}>
      <header className="App-header">
        <h1>Welcome to PosScan</h1>
        <h3 style={{ display: "inline-block", }}>Posture&nbsp;</h3><h3 style={{ display: "inline-block", }}>Good</h3>
        <br></br>
        <p>shoulder tilt {shoulderSlope}</p>
        <p>head tilt {headSlope}</p>
        <p>slouch {headSlope}</p>
        <Button variant="primary" onClick={changeSetPrefs}>Set Preferred Posture</Button>{' '}
        <Button variant="danger">Reset</Button>{' '}
        <Button onClick={play} variant="secondary">Test Sounds</Button>{' '}
        <h1>{count}</h1>
        <br></br>
        <br></br>
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
            position: "relative",
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
