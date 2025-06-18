import React, { useEffect, useRef, useState } from 'react';
import socketInstance from '../socket/SocketContext';
import { FaTimes, FaPhoneAlt, FaMicrophone, FaVideo, FaVideoSlash, FaMicrophoneSlash, FaDoorClosed, FaBars, FaShareAlt, FaStop } from "react-icons/fa";
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
      recordings.forEach(({ url }) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [recordings]);

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
  }, [user, socket, currentCallUserId, me, caller, callAccepted, reciveCall, selectedUser]);

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

  const startRecording = () => {
    if (!stream) {
      alert("Start or accept a call first to record video.");
      return;
    }

    let chunks = []; // local chunks collector

    try {
      const options = { mimeType: "video/webm" };
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        setRecordings((prev) => [
          ...prev,
          { id: Date.now(), url, createdAt: new Date().toISOString() },
        ]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("MediaRecorder not supported or error occurred.");
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
    <div className="flex min-h-screen bg-white-100">
      {!callAccepted && !reciveCall && isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden bg-black bg-opacity-50"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {!callAccepted && !reciveCall && (
        <aside
          className={`bg-gradient-to-br from-blue-800 to-cyan-500 text-white w-64 h-full p-4 space-y-4 fixed z-20 transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md:translate-x-0`}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Users</h1>
            <button
              type="button"
              className="md:hidden text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              <FaTimes />
            </button>
          </div>

          <input
            type="text"
            placeholder="Search user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 mb-2"
          />

          <ul className="space-y-4 overflow-y-auto">
            {filteredUsers.map((user) => (
              <li
                key={user._id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedUser === user._id
                  ? "bg-green-600"
                  : "hover:bg-gradient-to-r from-blue-500 to-cyan-500 " 
                  }`}
                onClick={() => handelSelectedUser(user._id)}
              >
                <div className="relative">
                  <img
                    src={user.profilepic || "/default-avatar.png"}
                    alt={`${user.username}'s profile`}
                    className="w-10 h-10 rounded-full border border-white"
                  />
                  {isOnlineUser(user._id) && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-bounce"></span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{user.username}</span>
                  <span className="text-xs text-purple-200 truncate w-32">
                    {user.fullname || user.email}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {user && <div
            onClick={handleLogout}
            className="fixed bottom-4 left-4 right-4 flex items-center gap-2 bg-red-400  hover:bg-red-700 px-4 py-1 cursor-pointer rounded-lg"
          >
            <FaDoorClosed />
            Logout
          </div>}
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
              <video
                ref={reciverVideo}
                autoPlay
                className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
              />
            )}

            <div className="absolute bottom-[75px] md:bottom-0 right-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg p-2 flex flex-col items-center max-w-[280px]">
              <video
                ref={myVideo}
                autoPlay
                playsInline
                className="w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg"
              />

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

              {recordings.length > 0 && (
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
              )}
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

          <div className="md:w-2/5 bg-gray-900 text-white flex flex-col justify-between rounded-lg m-3 shadow-lg border border-gray-700 max-h-screen">
            <div className="p-4 border-b border-gray-700 flex items-center gap-3 sticky top-0 bg-gray-900 z-20">
              <img
                src={chatPartnerUser?.profilepic || "/default-avatar.png"}
                alt="Chat Partner"
                className="w-12 h-12 rounded-full border border-white"
              />
              <div>
                <h2 className="font-bold text-lg">
                  {chatPartnerUser?.username || "Unknown User"}
                </h2>
                {isOnlineUser(chatPartnerUser) && (
                  <span className="text-green-400 text-sm">Online</span>
                )}
              </div>
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
                className="ml-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!chatInput.trim() || !chatPartnerId}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 md:ml-72 text-white">
          <button
            type="button"
            className=" flex md:hidden text-2xl text-black mb-4 "
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          <div className="flex flex-col items-center justify-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md min-h-[300px]">
            <div className="w-48 h-48">
              <Lottie animationData={wavingAnimation} loop autoplay />
            </div>
            <div className="gap-8 text-center px-5">
              <h1 className="text-5xl font-extrabold p-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
               👋 Hey {user?.fullname || "Guest"}! 
              </h1>
              <p className="text-2xl text-gray-300 mt-2">
                Ready to <strong>connect with friends instantly?</strong> Just{" "}
                <strong>select a user</strong> and start your video call or chat! 🎥💬✨
              </p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm">
            <h2 className="text-4xl pb-4 font-semibold mb-2">💡 How to Connect?</h2>
            <ul className="list-disc pl-6 text-lg space-y-2 text-gray-400">
              <li>📌 Open the sidebar to see online users.</li>
              <li>🔍 Use the search bar to find a specific person.</li>
              <li>🎥 Click on a user to start a video call instantly!</li>
              <li>💬 Or start chatting instantly via the chat panel after selecting a user!</li>
              <li>🖥️ Use the screen sharing button during a call to share your screen.</li>
            </ul>
          </div>
        </div>
      )}

      {showUserDetailModal && modalUser && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className='font-black text-xl mb-2'>User Details</p>
              <img
                src={modalUser.profilepic || "/default-avatar.png"}
                alt="User"
                className="w-20 h-20 rounded-full border-4 border-blue-500"
              />
              <h3 className="text-lg font-bold mt-3">{modalUser.username}</h3>
              <p className="text-sm text-gray-500">{modalUser.email}</p>

              <div className="flex gap-4 mt-5">
                <button
                  onClick={() => {
                    setSelectedUser(modalUser._id);
                    startCall();
                    setShowUserDetailModal(false);
                  }}
                  className="bg-green-600  hover:bg-green-800 text-white px-4 py-1 rounded-lg w-28 flex items-center gap-2 justify-center"
                >
                  Call <FaPhoneAlt />
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="bg-gray-400  hover:bg-red-700 text-white px-4 py-1 rounded-lg w-28"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {callRejectedPopUp && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call Rejected From...</p>
              <img
                src={rejectorData.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{rejectorData.name}</h3>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    startCall();
                  }}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Call Again <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endCallCleanup();
                    setCallRejectedPopUp(false);
                    setShowUserDetailModal(false);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Back <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reciveCall && !callAccepted && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call From...</p>
              <img
                src={caller?.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{callerName}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Accept <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Reject <FaPhoneSlash />
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