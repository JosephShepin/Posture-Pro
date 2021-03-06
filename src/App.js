import React, { useEffect, useState } from 'react';
import "./styles.css";

import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton } from "./utilities";
import Notifier from "react-desktop-notification"
import { Button, Navbar, Nav, NavDropdown, Form, FormControl, Spinner, ButtonGroup } from 'react-bootstrap';
var classNames = require('classnames');

export default function App() {
  const [shoulderSlope, setShoulderSlope] = useState(0);
  const [shoulderSlopeOffset, setShoulderSlopeOffset] = useState(0);

  const [headSlope, setHeadSlope] = useState(0);
  const [headSlopeOffset, setHeadSlopeOffset] = useState(0);
  const [shoulderY, setShoulderY] = useState(0)
  const [shoulderYOffset, setShoulderYOffset] = useState(0)
  const webcamRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [numIssues, setNumIssues] = useState(-1)
  const [weights, setWeights] = useState([.15,.15,.15])

  const detectWebcamFeed = async (posenet_model) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      var count = parseInt(localStorage.getItem('count')) || 0
      var settings = (localStorage.getItem('settings') || ".15,.15,.15").split(",") //shoulder tilt, head tilt, slouch
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
      setShoulderYOffset(calcShoulderYOffset(shoY,slouchSetting))
      // setShoulderYOffset((shoY,slouchSetting))
      setShoulderSlope(Math.round(shoulderSlope * 100) / 100)
      setShoulderSlopeOffset(Math.round((shoulderTiltSetting - shoulderSlope) * 100) / 100)

      localStorage.setItem('shoulderSlope', Math.round(shoulderSlope * 100) / 100);

      var leftEar = pose["keypoints"][3]["position"]
      var rightEar = pose["keypoints"][4]["position"]
      var headSlope = (rightEar['y'] - leftEar['y']) / (rightEar['x'] - leftEar['x'])
      setHeadSlope(Math.round(headSlope * 100) / 100)
      setHeadSlopeOffset(Math.round((headTiltSetting - headSlope) * 100) / 100)


      var weights = (localStorage.getItem('weights') || ".15,.15,.15").split(",") //shoulder tilt, head tilt, slouch
      var shoulderTiltWeight = weights[0]
      var headTiltWeight = weights[1]
      var slouchWeight = weights[2]

      var tempweights = [];
      tempweights.push(shoulderTiltWeight)
      tempweights.push(headTiltWeight)
      tempweights.push(slouchWeight)
      setWeights(tempweights)

      var shoulderIssue = Math.abs(shoulderSlope - shoulderTiltSetting) > shoulderTiltWeight
      var headIssue = Math.abs(headSlope - headTiltSetting) > headTiltWeight
      var postureIssue = calcShoulderYOffset(shoY,slouchSetting) > slouchWeight

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
      if (count > 30) {
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
    Notifier.start("Check your posture", "You have been sitting poorly for the last minute. Consider repositioning", "", "https://i.ibb.co/fGbcBtW/logo.png");
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
    }, 1000);
  }, []);

  function calcShoulderYOffset(a,b){
    var output =  (Math.round(((a/25) - (b/25))*100)/100)
    console.log(output)
    return output
 
   }
  //calculate shoulder slope
  const drawResult = (pose, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext("2d");
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;
    drawKeypoints(pose["keypoints"], .3, ctx);
  };

  function changeWeight(item,increment){ //0 - shoulder tilt , 1 - head tilt, 2 - slouch, boolean
    console.log(item + " t " + increment)
    var weights = (localStorage.getItem('weights') || ".15,.15,.15").split(",") //shoulder tilt, head tilt, slouch
    console.log(weights[1])
    console.log(weights)
    console.log(parseFloat(weights[1]))
    var shoulderTiltWeight =  Math.round(parseFloat(weights[0]) * 100) / 100
    var headTiltWeight =  Math.round(parseFloat(weights[1]) * 100) / 100
    var slouchWeight =  Math.round(parseFloat(weights[2]) * 100) / 100
    if(item == 0){ //shoulder tilt

      if(increment && shoulderTiltWeight <= .9){
        console.log("increasing")
        shoulderTiltWeight += .1;
      }else if(!increment && shoulderTiltWeight > .1){
        shoulderTiltWeight -= .1;
      }
    }else if(item == 1 ){ //head tilt
      if(increment &&  headTiltWeight <= .9){
        headTiltWeight += .1;
      }else if(!increment && headTiltWeight > .1){
        headTiltWeight -= .1;
      }
    }else if(item == 2){
      if(increment &&  slouchWeight <= .9){
        slouchWeight += .1;
      }else if(!increment && slouchWeight > .1){
        slouchWeight -= .1;
      }
    }
    var newWeights = [];
    newWeights.push(Math.round(parseFloat(shoulderTiltWeight) * 100) / 100)
    newWeights.push(Math.round(parseFloat(headTiltWeight) * 100) / 100)
    newWeights.push(Math.round(parseFloat(slouchWeight) * 100) / 100)
    console.log("new weights " + newWeights)
    setWeights(newWeights)
    localStorage.setItem('weights', String(newWeights).replaceAll("[", "").replaceAll("]", ""));
  }


  var statuses = new Map([
    [0, "Good"],
    [1, "Fair"],
    [2, "Bad"],
    [3, "Very Bad"],
  ]);
  var button1 = classNames(
    'primary',
    {
      'disabled': numIssues == -1
    }
  );
  var button2 = classNames(
    'danger',
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
        <Navbar.Brand >Posture Pro</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Nav.Link>Home</Nav.Link>
            <Nav.Link >App</Nav.Link>
          </Nav>
        </Navbar.Collapse>
        <Nav className="mr-auto">
            <Nav.Link href='https://github.com/jshepin/hackVH'>View the project on github</Nav.Link>
          </Nav>
      </Navbar>
      <header className="App-header" style={{ background: "#f8f9fa", borderRadius: "10px", padding: "15px", paddingTop: "20px", maxWidth: "800px", margin: "auto", marginTop: "30px" }}>
        <h1 style={{fontSize:"35px"}}>Welcome to Posture Pro</h1>

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
         <h4 style={{ marginTop: "15px"}}>Sensitivity Adjustment</h4>
        <div style={{ display: "flex", justifyContent: "space-around", padding: "10px", marginTop: "10px" }}>
         
          <div>
            <p>Shoulder Tilt</p>
            <p>{weights[0]}</p>
            <ButtonGroup>
              <Button onClick={() => changeWeight(0,false)} variant={button2}>-</Button>
              <Button onClick={() => changeWeight(0,true)} variant={button2}>+</Button>
            </ButtonGroup>
          </div>

          <div>
            <p>Head Tilt</p>
            <p>{weights[1]}</p>
            <ButtonGroup>
              <Button onClick={() => changeWeight(1,false)} variant={button2}>-</Button>
              <Button onClick={() => changeWeight(1,true)} variant={button2}>+</Button>
            </ButtonGroup>
          </div>
          <div>
            <p>Shoulder Alignment</p>
            <p>{weights[2]}</p>
            <ButtonGroup>
              <Button onClick={() => changeWeight(2,false)} variant={button2}>-</Button>
              <Button onClick={() => changeWeight(2,true)} variant={button2}>+</Button>
            </ButtonGroup>
          </div>
        </div>
      </header>
      <br></br>
      <p style={{ color: "grey", fontSize: "17px" }}>Made By Joseph Shepin</p>
    </div>
  );
}

