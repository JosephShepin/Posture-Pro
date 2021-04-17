import React, { useEffect, useState } from 'react';
import "./styles.css";

import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton } from "./utilities";
import Notifier from "react-desktop-notification"
import { Button, Navbar, Nav, NavDropdown, Form, FormControl, Spinner } from 'react-bootstrap';
var classNames = require('classnames');

export default function App() {
  const bounds = .15;
  const slouchBound = 20;
  const [shoulderSlope, setShoulderSlope] = useState(0);
  const [shoulderSlopeOffset, setShoulderSlopeOffset] = useState(0);

  const [headSlope, setHeadSlope] = useState(0);
  const [headSlopeOffset, setHeadSlopeOffset] = useState(0);
  const [shoulderY, setShoulderY] = useState(0)
  const [shoulderYOffset, setShoulderYOffset] = useState(0)
  const [setPrefs, setSetPrefs] = useState(false)
  const webcamRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [numIssues, setNumIssues] = useState(-1)


  const detectWebcamFeed = async (posenet_model) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      var count = parseInt(localStorage.getItem('count')) || 0
      var settings = (localStorage.getItem('settings') || "0,0,0").split(",") //shoulder tilt, head tilt, slouch
      var shoulderTiltSetting = settings[0]
      var headTiltSetting = settings[1]
      var slouchSetting = settings[2]
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
      var shoulderSlope = (rightS['y'] - leftS['y']) / (rightS['x'] - leftS['x'])
   
      var shoY = Math.round((rightS['y'] + leftS['y']) / 2)
      setShoulderY(shoY)
      setShoulderYOffset(Math.round((shoY - slouchSetting) * 1.5))

      setShoulderSlope(Math.round(shoulderSlope * 100) / 100)
      setShoulderSlopeOffset(Math.round((shoulderTiltSetting - shoulderSlope) * 100) / 100)

      localStorage.setItem('shoulderSlope', Math.round(shoulderSlope * 100) / 100);

      var leftEar = pose["keypoints"][3]["position"]
      var rightEar = pose["keypoints"][4]["position"]
      var headSlope = (rightEar['y'] - leftEar['y']) / (rightEar['x'] - leftEar['x'])
      setHeadSlope(Math.round(headSlope * 100) / 100)
      setHeadSlopeOffset(Math.round((headTiltSetting - headSlope) * 100) / 100)

      var shoulderIssue = Math.abs(shoulderSlope - shoulderTiltSetting) > bounds
      var headIssue = Math.abs(headSlope - headTiltSetting) > bounds
      var postureIssue = Math.abs(shoY - slouchSetting) > slouchBound
      var issuesArray = [];
      issuesArray.push(shoulderIssue ? 1 : 0)
      issuesArray.push(headIssue ? 1 : 0)
      issuesArray.push(postureIssue ? 1 : 0)
      localStorage.setItem('issues', issuesArray);
      var numissuescount = 0;
      for (var i = 0; i < issuesArray.length; i++) {
        if (issuesArray[i] == 1) {
          numissuescount = numissuescount + 1
        }
      }
      setNumIssues(numissuescount)

      if (shoulderIssue || headIssue || postureIssue) {
        count = count + 1
        localStorage.setItem('count', count);
      }
      if (count > 10) {
        console.log("sending notification")
        localStorage.setItem('count', 0) //reset count
        sendNotification()
      }
      drawResult(pose, video, videoWidth, videoHeight, canvasRef);
    }
  };

  const changeSetPrefs = () => {
    console.log("Saving settings")
    localStorage.setItem('count', 0) //reset count
    //save settings
    var newSettings = [];
    newSettings.push(shoulderSlope)
    newSettings.push(headSlope)
    newSettings.push(shoulderY)
    localStorage.setItem('settings', String(newSettings).replaceAll("[", "").replaceAll("]", ""));

  }

  const sendNotification = () => {
    Notification.requestPermission();
    Notifier.start("Check your posture", "You have been sitting poorly for the last minute. Consider repositioning", "www.google.com", "https://i.ibb.co/zZBZcFv/Untitled-design.png");
  }

  const runPosenet = async () => {
    const posenet_model = await posenet.load({
      inputResolution: { width: 640, height: 480 },
      scale: 0.8
    });
    return posenet_model;
  };

  var model;
  runPosenet().then((posenet_model) => {
    model = posenet_model;
  });

  useEffect(() => {
    detectWebcamFeed(model);
    setInterval(() => {
      detectWebcamFeed(model);
    }, 3000);
  }, []);

  //calculate shoulder slope
  const drawResult = (pose, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext("2d");
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;
    drawKeypoints(pose["keypoints"], .3, ctx);
    drawSkeleton(pose["keypoints"], 0.3, ctx);
  };

  var statuses = new Map([
    [0, "Good"],
    [1, "Ok"],
    [2, "Fair"],
    [3, "Poor"],
  ]);
  var button1 = classNames(
    'primary',
    {
      'disabled': numIssues == -1
    }
  );

  let spinner;

  if (numIssues == -1) {
    spinner = <div>
      <br></br>
      <Spinner animation="border" variant="success" role="status">
      </Spinner>
      <br></br>
      <br></br>
      <h4 style={{ color: "#3ba853" }}>Starting up...</h4>
    </div>
  } else {
    spinner = <div></div>
  }

  return (
    <div className="App" >
      <Navbar bg="light" expand="lg">
        <Navbar.Brand href="#home">Poscan</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Nav.Link href="#home">Home</Nav.Link>
            <Nav.Link href="#link">App</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <header className="App-header" style={{ background: "#f8f9fa", borderRadius: "10px", padding: "10px", maxWidth: "800px", margin: "auto", marginTop: "10px" }}>
        <h1>Welcome to PosScan</h1>

        {spinner}


        <h3 style={{ display: numIssues == -1 ? "none" : "inline-block", }}>Posture&nbsp;</h3><h3 style={{ display: "inline-block", }}>{statuses.get(numIssues)}</h3>
        <br></br>
        <p>Shoulder Tilt {shoulderSlopeOffset}</p>
        <p>Head Tilt {headSlopeOffset}</p>
        <p>Shoulder Alignment {shoulderYOffset}</p>
        <Button variant={button1} onClick={changeSetPrefs}>Set Preferred Posture</Button>{' '}
        {/* <Button variant="danger">Reset</Button>{' '} */}
        <Button onClick={sendNotification} variant="secondary">Test Notification</Button>{' '}
        <h1></h1>
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
      <br></br>
      <p style={{ color: "grey", fontSize: "17px" }}>Made By Joseph Shepin</p>
    </div>
  );
}

