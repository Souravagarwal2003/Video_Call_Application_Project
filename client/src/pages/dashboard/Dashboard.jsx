import React, { useEffect, useRef, useState } from 'react';
import socketInstance from '../socket/SocketContext';
import {
  FaTimes, FaPhoneAlt, FaMicrophone, FaVideo,
  FaVideoSlash, FaWindowRestore, FaMinus,
  FaMicrophoneSlash, FaDoorClosed, FaBars,
  FaShareAlt, FaCommentDots, FaStop
} from "react-icons/fa";
import Lottie from "lottie-react";
import { Howl } from "howler";
import wavingAnimation from "../../assets/waving.json";
import { FaPhoneSlash } from "react-icons/fa6";
import apiClient from "../../apiClient";
import { useUser } from '../../context/UserContextApi';
import { useNavigate } from 'react-router-dom';
import Peer from 'simple-peer';

function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOnline, setUserOnline] = useState([]);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [me, setMe] = useState("");
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const myVideo = useRef(null);
  const reciverVideo = useRef(null);
  const connectionRef = useRef(null);
  const hasJoined = useRef(false);

  const [reciveCall, setReciveCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerWating, setCallerWating] = useState(false);

  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [rejectorData, setCallrejectorData] = useState(null);
  const [currentCallUserId, setCurrentCallUserId] = useState(null);

  const [mediaRecorder, setMediaRecorder] = useState(null);
  //const [recordedChunks, setRecordedChunks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]); // holds { id, url, createdAt }

  // Mic and Video state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Screensharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]); // List of messages in current chat (with selected user or caller)
  const [chatInput, setChatInput] = useState("");
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isSelfCameraMinimized, setIsSelfCameraMinimized] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const ringtone = useRef(null);

  // Sound for ringtone
  useEffect(() => {
    ringtone.current = new Howl({
      src: ["/ringtone.mp3"],
      loop: true,
      volume: 1.0,
    });

    // Cleanup on unmount
    return () => ringtone.current.unload();
  }, []);

  const socket = socketInstance.getSocket();
  useEffect(() => {
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      recordings.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [recordings]);

  useEffect(() => {
    async function setupStreams() {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;

        // For demo: assign remoteStream same as stream, replace with remote peer stream in real app
        setRemoteStream(currentStream);
        if (reciverVideo.current) reciverVideo.current.srcObject = currentStream;
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    }
    setupStreams();
  }, []);



  useEffect(() => {
    if (user && socket && !hasJoined.current) {
      socket.emit("join", { id: user._id, name: user.username });
      hasJoined.current = true;
    }

    socket.on("me", (id) => setMe(id));

    socket.on("callToUser", (data) => {
      setReciveCall(true);
      setCaller(data);
      setCallerName(data.name);
      setCallerSignal(data.signal);
      setCurrentCallUserId(data.from);  // Add this line
      if (ringtone.current && !ringtone.current.playing()) {
        ringtone.current.play();
      }
    });

    socket.on("callRejected", (data) => {
      setCallRejectedPopUp(true);
      setCallrejectorData(data);
      ringtone.stop();
    });

    socket.on("call-ended", (data) => {
      // Check if this call is with current user, just for safety
      if (data.from === currentCallUserId || data.to === me) {
        endCallCleanup();
      }
    });

    socket.on("userUnavailable", (data) => {
      alert(data.message || "User is not available.");
    });

    socket.on("userBusy", (data) => {
      alert(data.message || "User is currently in another call.");
    });

    socket.on("online-users", (onlineUsers) => {
      setUserOnline(onlineUsers);
    });


    socket.on("chat-message", (message) => {
      if (!currentCallUserId) return;
      if (message.from === currentCallUserId || message.to === currentCallUserId) {
        setChatMessages((prev) => [...prev, message]);

        if (isChatMinimized) {
          setHasUnreadMessages(true);
        }
      }
    });

    return () => {
      socket.off("me");
      socket.off("callToUser");
      socket.off("callRejected");
      socket.off("call-ended");
      socket.off("userUnavailable");
      socket.off("userBusy");
      socket.off("online-users");
      socket.off("chat-message");
    };
  }, [user, socket, currentCallUserId, isChatMinimized, me, caller, callAccepted, reciveCall, selectedUser]);

  // Function to start call (unchanged)
  const startCall = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }
      currentStream.getAudioTracks().forEach(track => (track.enabled = true));
      setCallRejectedPopUp(false);
      setIsSidebarOpen(false);
      setCallerWating(true);
      setSelectedUser(modalUser._id);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream
      });

      peer.on("signal", (data) => {
        socket.emit("callToUser", {
          callToUserId: modalUser._id,
          signalData: data,
          from: me,
          name: user.username,
          email: user.email,
          profilepic: user.profilepic,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;
          reciverVideo.current.muted = false;
          reciverVideo.current.volume = 1.0;
        }
      });

      socket.once("callAccepted", (data) => {
        setCallRejectedPopUp(false);
        setCallAccepted(true);
        setCurrentCallUserId(data.from);
        setCallerWating(false);
        setCaller(data.from);
        peer.signal(data.signal);
      });

      connectionRef.current = peer;
      setShowUserDetailModal(false);
      setChatMessages([]);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  // Accept call handler (unchanged except clear chat messages)
  const handelacceptCall = async () => {
    if (ringtone.current && ringtone.current.playing()) {
      ringtone.current.stop();
    }
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
      currentStream.getAudioTracks().forEach(track => (track.enabled = true));

      setCallAccepted(true);
      setReciveCall(true);
      setCallerWating(false);
      setIsSidebarOpen(false);
      setCurrentCallUserId(caller.from);  // Add this to set current call partner explicitly

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream
      });

      peer.on("signal", (data) => {
        socket.emit("answeredCall", {
          signal: data,
          from: me,
          to: caller.from,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;
          reciverVideo.current.muted = false;
          reciverVideo.current.volume = 1.0;
        }
      });

      if (callerSignal) peer.signal(callerSignal);
      connectionRef.current = peer;
      setChatMessages([]);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  // Reject call handler
  const handelrejectCall = () => {
    if (ringtone.current && ringtone.current.playing()) {
      ringtone.current.stop();
    }
    setCallerWating(false);
    setReciveCall(false);
    setCallAccepted(false);
    setCurrentCallUserId(null);

    socket.emit("reject-call", {
      to: caller.from,
      name: user.username,
      profilepic: user.profilepic
    });
  };

  // End call handler
  const handelendCall = () => {
    // Notify the other user that the call is ended
    socket.emit("call-ended", { to: currentCallUserId, from: me });

    // Perform local cleanup
    endCallCleanup();
  };


  // Cleanup after call ends
  const endCallCleanup = () => {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (reciverVideo.current) reciverVideo.current.srcObject = null;
    if (myVideo.current) myVideo.current.srcObject = null;
    connectionRef.current?.destroy();
    ringtone.current?.stop();

    setCallerWating(false);
    setStream(null);
    setReciveCall(false);
    setCallAccepted(false);
    setSelectedUser(null);
    setCurrentCallUserId(null);
    setChatMessages([]);
    setChatInput("");
    setIsScreenSharing(false);
  };

  // Mic toggle
  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Camera toggle
  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  // Screen sharing toggle
  const toggleScreenSharing = async () => {
    if (!callAccepted && !reciveCall) {
      alert("Start or accept a call first to share your screen.");
      return;
    }

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Replace the video track in the peer connection stream with screen track
        const screenTrack = screenStream.getVideoTracks()[0];

        // When user stops screen sharing from browser controls
        screenTrack.onended = () => {
          stopScreenSharing();
        };

        const sender = connectionRef.current?.streams[0]?.getTracks().find(track => track.kind === 'video');
        if (sender) {
          // We replace the video track sent to the peer 
          connectionRef.current.replaceTrack(sender, screenTrack, connectionRef.current.streams[0]);
        }

        // Update the local stream to screen share stream, but keep audio tracks from original stream
        const combinedStream = new MediaStream();
        screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
        stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
        setStream(combinedStream);

        if (myVideo.current) {
          myVideo.current.srcObject = combinedStream;
        }

        setIsScreenSharing(true);
      } catch (error) {
        console.error("Error sharing screen:", error);
      }
    } else {
      stopScreenSharing();
    }
  };

  // Stop screen sharing and switch back to camera video
  const stopScreenSharing = async () => {
    if (!stream) return;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      const videoTrack = videoStream.getVideoTracks()[0];

      const sender = connectionRef.current?.streams[0]?.getTracks().find(track => track.kind === 'video');
      if (sender) {
        connectionRef.current.replaceTrack(sender, videoTrack, connectionRef.current.streams[0]);
      }

      const combinedStream = new MediaStream();
      videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      setStream(combinedStream);

      if (myVideo.current) {
        myVideo.current.srcObject = combinedStream;
      }
      setIsScreenSharing(false);
      setIsCamOn(true);
    } catch (error) {
      console.error("Error stopping screen share:", error);
    }
  };

  // Fetch all users
  const allusers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user');
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    allusers();
  }, []);

  const isOnlineUser = (userId) => userOnline.some((u) => u.userId === userId);

  const handelSelectedUser = (userId) => {
    if (callAccepted || reciveCall) {
      alert("You must end the current call before starting a new one.");
      return;
    }
    const selected = filteredUsers.find(user => user._id === userId);
    setModalUser(selected);
    setShowUserDetailModal(true);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    if (callAccepted || reciveCall) {
      alert("You must end the call before logging out.");
      return;
    }
    try {
      await apiClient.post('/auth/logout');
      socket.off("disconnect");
      socket.disconnect();
      socketInstance.setSocket();
      updateUser(null);
      localStorage.removeItem("userData");
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Send chat message handler
  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (!currentCallUserId) {
      alert("Select a user to chat with!");
      return;
    }

    const messageData = {
      from: me,
      to: currentCallUserId,
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    socket.emit("send-chat-message", messageData);
    setChatMessages((prev) => [...prev, messageData]);
    setChatInput("");
  };

  const startRecording = async () => {
    try {
      // Request screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true, // some browsers allow system audio here
      });

      // Request microphone audio (optional fallback)
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Merge screen video + mic audio
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      // Create MediaRecorder
      const options = { mimeType: 'video/webm; codecs=vp9' };
      const recorder = new MediaRecorder(combinedStream, options);

      let chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        setRecordings((prev) => [
          ...prev,
          { id: Date.now(), url, createdAt: new Date().toISOString() },
        ]);

        // Optional: Auto download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Stop sharing when user ends screen share manually
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

    } catch (error) {
      console.error('Error starting full-screen recording:', error);
      alert('Screen recording failed. Grant permission and try again.');
    }
  };


  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const getUserById = (id) => users.find(u => u._id === id);

  const chatPartnerId = callAccepted || reciveCall ? (caller?.from || selectedUser) : selectedUser;
  // Helper to get chat partner user info
  const chatPartnerUser = (() => {
    // 1. Try to get from users list by currentCallUserId
    const userFromList = currentCallUserId ? getUserById(currentCallUserId) : null;

    if (userFromList) return userFromList;

    // 2. If no user found from users array, fallback:
    // If current user is caller (we started call), modalUser is callee info
    if (callAccepted || reciveCall) {
      if (!caller) {
        // We are caller side, modalUser is callee info
        if (modalUser && modalUser._id === currentCallUserId) {
          return modalUser;
        }
      } else {
        // We are callee side, caller contains caller info
        if (caller.from === currentCallUserId) {
          return { username: caller.name, profilepic: caller.profilepic };
        }
      }
    }

    // 3. If no call active or no info, fallback to selectedUser from users list
    if (selectedUser) {
      return getUserById(selectedUser);
    }

    return null;
  })();
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,119,198,0.15),rgba(255,255,255,0.05))]"></div>
      
      {!callAccepted && !reciveCall && isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden bg-black/40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {!callAccepted && !reciveCall && (
        <aside
          className={`bg-gray-900/40 backdrop-blur-xl border-r border-gray-700/30 text-white w-72 h-full p-6 space-y-4 fixed z-20 transition-all duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Users</h1>
            <button
              type="button"
              className="md:hidden text-white hover:text-gray-400 transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>

          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-xl bg-gray-800/50 text-white border border-gray-700/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent placeholder-gray-400 transition-all"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 pr-2">
            <ul className="space-y-2">
              {filteredUsers.map((user) => (
                <li
                  key={user._id}
                  onClick={() => handelSelectedUser(user._id)}
                  className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedUser === user._id
                      ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 shadow-lg"
                      : "hover:bg-gray-800/50 hover:shadow-md"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.profilepic || "/default-avatar.png"}
                      alt={`${user.username}'s profile`}
                      className={`w-12 h-12 rounded-full border-2 transition-transform duration-200 ${
                        selectedUser === user._id ? "border-white" : "border-gray-600 group-hover:border-gray-400"
                      }`}
                    />
                    {isOnlineUser(user._id) && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full shadow-lg">
                        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`font-semibold truncate ${selectedUser === user._id ? "text-white" : "text-gray-200"}`}>
                      {user.username}
                    </span>
                    <span className={`text-sm truncate ${selectedUser === user._id ? "text-blue-200" : "text-gray-400"}`}>
                      {user.fullname || user.email}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {user && (
            <button
              onClick={handleLogout}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-600 hover:to-red-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FaDoorClosed className="w-5 h-5" />
              <span>Logout</span>
            </button>
          )}
        </aside>
      )}
      {(selectedUser || reciveCall || callAccepted) ? (
        <div className="relative w-full h-screen bg-black flex flex-col md:flex-row justify-center items-stretch">
          <div className={`flex flex-col relative md:w-3/5 h-full justify-center items-center ${callerWating ? 'justify-start pt-20' : ''}`}>
            {callerWating ? (
              <div>
                <div className="flex flex-col items-center">
                  <p className='font-black text-xl mb-2 text-white'>User Details</p>
                  <img
                    src={modalUser?.profilepic || "/default-avatar.png"}
                    alt="User"
                    className="w-20 h-20 rounded-full border-4 border-blue-500 animate-bounce"
                  />
                  <h3 className="text-lg font-bold mt-3 text-white">{modalUser?.username}</h3>
                  <p className="text-sm text-gray-300">{modalUser?.email}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Receiver video: always full size, never minimized */}
                {/* <div className="flex-grow relative"> */}
                <video
                  ref={reciverVideo}
                  autoPlay
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
                  muted={false}
                />
                {/* </div> */}
              </>

            )}

            <div className="fixed bottom-[75px] md:bottom-0  left-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg p-2 flex flex-col items-center max-w-[280px]">
              {/* <video
                ref={myVideo}
                autoPlay
                playsInline
                // className="w-42 h-40 md:w-56 md:h-52 object-cover rounded-lg"
              /> */}
              <>
                {/* Caller self video: floating preview with minimize/restore toggle */}
                {!isSelfCameraMinimized ? (
                  <div className="flex bottom-4 right-4 w-60 h-50 rounded-lg overflow-hidden border-2 border-gray-700  shadow-lg ">
                    <video
                      ref={myVideo}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-3 right-3 bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full p-1 text-white cursor-pointer"
                      onClick={() => setIsSelfCameraMinimized(true)}
                      title="Minimize Self Camera"
                      style={{ width: 24, height: 24 }}
                    >
                      <FaMinus size={14} />
                    </button>
                  </div>
                ) : (
                  // Minimized self camera preview fixed bottom-left
                  <div
                    className="flex bottom-20 left-4 w-30 h-20 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg cursor-pointer "
                    title="Restore Self Camera"
                    onClick={() => setIsSelfCameraMinimized(false)}
                  >
                    <video
                      ref={myVideo}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-3 right-3 bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full p-1 text-white cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSelfCameraMinimized(false);
                      }}
                      title="Restore Self Camera"
                      style={{ width: 24, height: 24 }}
                    >
                      <FaWindowRestore size={14} />
                    </button>
                  </div>
                )}</>
              <div className="flex gap-2 mt-2">
                {!isRecording ? (
                  <button
                    className="bg-green-600 text-white rounded px-3 py-1 text-sm shadow hover:bg-green-700"
                    onClick={startRecording}
                    title="Start Recording"
                  >
                    Record
                  </button>
                ) : (
                  <button
                    className="bg-red-600 text-white rounded px-3 py-1 text-sm shadow hover:bg-red-700"
                    onClick={stopRecording}
                    title="Stop Recording"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* {recordings.length > 0 && (
                <div className="mt-3 w-full overflow-auto max-h-[150px]">
                  <h4 className="text-white text-sm mb-2">Recordings:</h4>
                  {recordings.map(({ id, url, createdAt }) => (
                    <video
                      key={id}
                      controls
                      src={url}
                      className="w-full rounded mb-2"
                      title={`Recorded at ${new Date(createdAt).toLocaleTimeString()}`}
                    />
                  ))}
                </div>
              )} */}
            </div>

            <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center">
              <button
                type="button"
                className="md:hidden text-2xl text-white cursor-pointer"
                onClick={() => setIsSidebarOpen(true)}
              >
                <FaBars />
              </button>
              {callerName || (chatPartnerUser?.username || "Caller")}
            </div>

            {(callAccepted || reciveCall) && (
              <div className="absolute bottom-4 w-full flex justify-center gap-4 z-10">
                <button
                  type="button"
                  className="bg-red-600 p-4 rounded-full text-white shadow-lg cursor-pointer"
                  onClick={handelendCall}
                  title="End Call"
                >
                  <FaPhoneSlash size={24} />
                </button>
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isMicOn ? "bg-green-600" : "bg-red-600"
                    }`}
                  title={isMicOn ? "Mute Mic" : "Unmute Mic"}
                >
                  {isMicOn ? <FaMicrophone size={24} /> : <FaMicrophoneSlash size={24} />}
                </button>
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isCamOn ? "bg-green-600" : "bg-red-600"
                    }`}
                  title={isCamOn ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {isCamOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
                </button>
                <button
                  type="button"
                  onClick={toggleScreenSharing}
                  className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isScreenSharing ? "bg-red-700" : "bg-blue-600"
                    }`}
                  title={isScreenSharing ? "Stop Screen Sharing" : "Start Screen Sharing"}
                >
                  {isScreenSharing ? <FaStop size={24} /> : <FaShareAlt size={24} />}
                </button>
              </div>
            )}
          </div>

          {!isChatMinimized ? (
            <div className="md:w-2/5 bg-gray-900 text-white flex flex-col justify-between rounded-lg m-3 shadow-lg border border-gray-700 max-h-screen transition-all duration-300 z-1">
              <div className="p-4 border-b border-gray-700 flex items-center gap-3 sticky top-0 bg-gray-900 z-20">
                <img
                  src={chatPartnerUser?.profilepic || "/default-avatar.png"}
                  alt="Chat Partner"
                  className="w-12 h-12 rounded-full border border-white"
                />
                <div className="flex-1">
                  <h2 className="font-bold text-lg">
                    {chatPartnerUser?.username || "Unknown User"}
                  </h2>
                  {isOnlineUser(chatPartnerUser) && (
                    <span className="text-green-400 text-sm">Online</span>
                  )}
                </div>
                {/* Minimize chat button */}
                <button
                  type="button"
                  className="text-white hover:text-gray-400 ml-2"
                  onClick={() => setIsChatMinimized(true)}
                  title="Minimize Chat"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div
                className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
                id="chat-messages"
              >
                {chatMessages.length === 0 && (
                  <p className="text-gray-500 text-center mt-6">Start the conversation!</p>
                )}

                {chatMessages.map((msg, index) => {
                  const isMe = msg.from === me;
                  return (
                    <div
                      key={index}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md px-3 py-2 rounded-lg break-words whitespace-pre-wrap ${isMe ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"
                          }`}
                      >
                        <div className="text-sm">{msg.content}</div>
                        <div className="text-[10px] text-gray-300 text-right mt-1 select-none">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={sendMessage}
                className="flex p-3 border-t border-gray-700 bg-gray-800 rounded-b-lg"
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 rounded-lg px-3 py-2 focus:outline-none text-white"
                  disabled={!chatPartnerId}
                />
                <button
                  type="submit"
                  className="ml-2 bg-blue-600 hover:bg-blue-800 rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!chatInput.trim() || !chatPartnerId}
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            // Minimized chat panel bar
            <div
              className=" bottom-4 right-4 z-50 bg-gray-900 text-white rounded-lg shadow-lg cursor-pointer p-2 flex items-center gap-2 "
              onClick={() => {
                setIsChatMinimized(false);
                setHasUnreadMessages(false);
              }}
              title="Open Chat"
              style={{ width: '60px', height: '40px' }}
            >
              <FaCommentDots size={24} />
              {hasUnreadMessages && (
                <span className="  top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-600 animate-pulse" />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 p-8 md:ml-72 text-white">
          <button
            type="button"
            className="flex md:hidden items-center justify-center w-10 h-10 mb-6 text-white hover:text-gray-300 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars className="w-6 h-6" />
          </button>

          <div className="relative flex flex-col items-center justify-center gap-8 mb-8 rounded-2xl shadow-2xl overflow-hidden min-h-[400px]">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
            {/* Animated pattern overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
            
            <div className="relative z-10 w-48 h-48 mb-4">
              <Lottie animationData={wavingAnimation} loop autoplay />
            </div>
            
            <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
              <h1 className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                Welcome back, {user?.fullname || "Guest"}! 👋
              </h1>
              <p className="text-2xl text-gray-300 leading-relaxed">
                Ready to connect with friends? Start a <span className="text-blue-400 font-semibold">video call</span> or <span className="text-purple-400 font-semibold">chat</span> instantly!
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-8 shadow-xl border border-gray-700/30">
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Quick Start Guide
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: "�",
                  title: "Select a Contact",
                  description: "Browse your contacts in the sidebar or use the search to find someone specific."
                },
                {
                  icon: "🎥",
                  title: "Start a Call",
                  description: "Click on a user's profile to initiate a video call with crystal-clear quality."
                },
                {
                  icon: "💬",
                  title: "Chat Anytime",
                  description: "Send messages before, during, or after calls to stay connected."
                },
                {
                  icon: "🖥️",
                  title: "Share Your Screen",
                  description: "Present your screen during calls for better collaboration."
                }
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 transition-all duration-300">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-100 mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showUserDetailModal && modalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-700/50">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-75 blur"></div>
                <img
                  src={modalUser.profilepic || "/default-avatar.png"}
                  alt="User"
                  className="relative w-24 h-24 rounded-full border-2 border-white shadow-xl"
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{modalUser.username}</h3>
              <p className="text-gray-400 mb-6">{modalUser.email}</p>

              <div className="flex gap-4 w-full">
                <button
                  onClick={() => {
                    setSelectedUser(modalUser._id);
                    startCall();
                    setShowUserDetailModal(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FaPhoneAlt className="w-4 h-4" />
                  <span>Start Call</span>
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {callRejectedPopUp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-700/50">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-red-600 to-orange-600 opacity-75 blur"></div>
                <img
                  src={rejectorData.profilepic || "/default-avatar.png"}
                  alt="Caller"
                  className="relative w-24 h-24 rounded-full border-2 border-white shadow-xl"
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{rejectorData.name}</h3>
              <p className="text-red-400 font-medium mb-6">Call Rejected</p>

              <div className="flex gap-4 w-full">
                <button
                  type="button"
                  onClick={() => startCall()}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FaPhoneAlt className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endCallCleanup();
                    setCallRejectedPopUp(false);
                    setShowUserDetailModal(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reciveCall && !callAccepted && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-700/50">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-75 blur animate-pulse"></div>
                <img
                  src={caller?.profilepic || "/default-avatar.png"}
                  alt="Caller"
                  className="relative w-24 h-24 rounded-full border-2 border-white shadow-xl"
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{callerName}</h3>
              <p className="text-gray-400 mb-6">{caller?.email}</p>
              <p className="text-blue-400 font-medium mb-6 animate-pulse">Incoming Call...</p>

              <div className="flex gap-4 w-full">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FaPhoneAlt className="w-4 h-4" />
                  <span>Accept</span>
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FaPhoneSlash className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;