import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import dbConnect from "./db/dbConnect.js";
import authRoute from "./rout/authRout.js";
import userRoute from "./rout/userRout.js";

// ✅ Load environment variables
dotenv.config();

// 🌍 Create Express app
const app = express();
const PORT = process.env.PORT || 3100;
const server = createServer(app);

// ✅ Allowed Origins from .env
const allowedOrigins = [process.env.CLIENT_URL];
console.log("Allowed Origins:", allowedOrigins);

// ✅ Define reusable CORS options
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

// ✅ Apply CORS middleware (important order!)
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// 🛠 JSON and cookie parser
app.use(express.json());
app.use(cookieParser());

// ✅ API routes
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);

// 🏠 Test route
app.get("/", (req, res) => {
  res.json("Server is running!");
});

// ✅ Initialize Socket.io
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins[0],
    methods: ["GET", "POST"],
  },
});
console.log("[SUCCESS] Socket.io initialized with CORS");

// 🔴 WebSocket logic
let onlineUsers = [];
const activeCalls = new Map();

io.on("connection", (socket) => {
  console.log(`[INFO] New connection: ${socket.id}`);
  socket.emit("me", socket.id);

  socket.on("join", (user) => {
    if (!user || !user.id) return;
    socket.join(user.id);

    const existingUser = onlineUsers.find((u) => u.userId === user.id);
    if (existingUser) {
      existingUser.socketId = socket.id;
    } else {
      onlineUsers.push({ userId: user.id, name: user.name, socketId: socket.id });
    }

    io.emit("online-users", onlineUsers);
  });

  socket.on("callToUser", (data) => {
    const callee = onlineUsers.find((u) => u.userId === data.callToUserId);
    if (!callee) {
      socket.emit("userUnavailable", { message: "User is offline." });
      return;
    }

    if (activeCalls.has(data.callToUserId)) {
      socket.emit("userBusy", { message: "User is currently in another call." });
      io.to(callee.socketId).emit("incomingCallWhileBusy", {
        from: data.from, name: data.name, email: data.email, profilepic: data.profilepic,
      });
      return;
    }

    io.to(callee.socketId).emit("callToUser", {
      signal: data.signalData,
      from: data.from,
      name: data.name,
      email: data.email,
      profilepic: data.profilepic,
    });
  });

  socket.on("answeredCall", (data) => {
    io.to(data.to).emit("callAccepted", {
      signal: data.signal,
      from: data.from,
    });

    activeCalls.set(data.from, { with: data.to, socketId: socket.id });
    activeCalls.set(data.to, { with: data.from, socketId: data.to });
  });

  socket.on("reject-call", (data) => {
    io.to(data.to).emit("callRejected", {
      name: data.name,
      profilepic: data.profilepic,
    });
  });

  socket.on("call-ended", (data) => {
    io.to(data.to).emit("callEnded", { name: data.name });
    activeCalls.delete(data.from);
    activeCalls.delete(data.to);
  });

  socket.on("send-chat-message", (message) => {
    if (!message || !message.from || !message.to || !message.content) return;
    io.to(message.to).emit("chat-message", message);
  });

  socket.on("disconnect", () => {
    const user = onlineUsers.find((u) => u.socketId === socket.id);
    if (user) {
      activeCalls.delete(user.userId);
      for (const [key, value] of activeCalls.entries()) {
        if (value.with === user.userId) activeCalls.delete(key);
      }
    }

    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
    io.emit("online-users", onlineUsers);
    socket.broadcast.emit("discounnectUser", { disUser: socket.id });

    console.log(`[INFO] Disconnected: ${socket.id}`);
  });
});

// ✅ Start the server
(async () => {
  try {
    await dbConnect();
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
})();
