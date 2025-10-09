import express from "express"; 
import dotenv from "dotenv"; 
import cors from "cors"; 
import cookieParser from "cookie-parser"; 
import { createServer } from "http"; 
import { Server } from "socket.io"; 

import dbConnect from "./db/dbConnect.js";
import authRoute from "./rout/authRout.js"; 
import userRoute from "./rout/userRout.js"; 

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3100;

const server = createServer(app);

const allowedOrigins = [process.env.CLIENT_URL];
console.log(allowedOrigins);;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); 
    } else {
      callback(new Error('Not allowed by CORS')); 
    }
  },
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
}));

app.use(express.json()); 
app.use(cookieParser()); 

app.use("/api/auth", authRoute); // Authentication routes (login, signup, logout)
app.use("/api/user", userRoute); // User-related routes (profile, settings)

app.get('/', (req, res) => {
  res.json("Server is running!");
})

const io = new Server(server, {
  pingTimeout: 60000, 
  cors: {
    origin: allowedOrigins[0], 
    methods: ["GET", "POST"], 
  },
});
console.log("[SUCCESS] Socket.io initialized with CORS"); 

let onlineUsers = []; 
const activeCalls = new Map();

io.on("connection", (socket) => {
  console.log(`[INFO] New connection: ${socket.id}`); 

  socket.emit("me", socket.id);

  socket.on("join", (user) => {
    if (!user || !user.id) {
      console.warn("[WARNING] Invalid user data on join"); 
      return;
    }

    socket.join(user.id); 
    const existingUser = onlineUsers.find((u) => u.userId === user.id); 

    if (existingUser) {
      existingUser.socketId = socket.id; 
    } else {
      onlineUsers.push({
        userId: user.id,
        name: user.name,
        socketId: socket.id,
      });
    }

    io.emit("online-users", onlineUsers); 
  });

  socket.on("callToUser", (data) => {
    const callee = onlineUsers.find((user) => user.userId === data.callToUserId); 

    if (!callee) {
      socket.emit("userUnavailable", { message: "User is offline." }); 
      return;
    }

    if (activeCalls.has(data.callToUserId)) {
      socket.emit("userBusy", { message: "User is currently in another call." });

      io.to(callee.socketId).emit("incomingCallWhileBusy", {
        from: data.from,
        name: data.name,
        email: data.email,
        profilepic: data.profilepic,
      });

      return;
    }

    io.to(callee.socketId).emit("callToUser", {
      signal: data.signalData, // WebRTC signal data
      from: data.from, // Caller IDz
      name: data.name, // Caller name
      email: data.email, // Caller email
      profilepic: data.profilepic, // Caller profile picture
    });
  });

  socket.on("answeredCall", (data) => {
    io.to(data.to).emit("callAccepted", {
      signal: data.signal, // WebRTC signal
      from: data.from, // Caller ID
    });

    activeCalls.set(data.from, { with: data.to, socketId: socket.id });
    activeCalls.set(data.to, { with: data.from, socketId: data.to });
  });

  socket.on("reject-call", (data) => {
    io.to(data.to).emit("callRejected", {
      name: data.name, // Rejected user's name
      profilepic: data.profilepic // Rejected user's profile picture
    });
  });

  socket.on("call-ended", (data) => {
    io.to(data.to).emit("callEnded", {
      name: data.name, // User who ended the call
    });

    activeCalls.delete(data.from);
    activeCalls.delete(data.to);
  });

  socket.on("send-chat-message", (message) => {
    /*
      message should have these properties:
      {
        from: string (userId of sender),
        to: string (userId of recipient),
        content: string,
        timestamp: ISO string or string date/time
      }
    */
    if (!message || !message.from || !message.to || !message.content) {
      console.warn("[WARNING] Invalid chat message received", message);
      return;
    }

    io.to(message.to).emit("chat-message", message);
  });

  socket.on('caption', (data) => {
    if (!data || !data.to) return;
    const recipient = onlineUsers.find((u) => u.userId === data.to);
    if (recipient && recipient.socketId) {
      io.to(recipient.socketId).emit('caption', data);
    }
  });

  socket.on('request-captions', (data) => {
    if (!data || !data.to) return;
    const recipient = onlineUsers.find((u) => u.userId === data.to);
    if (recipient && recipient.socketId) {
      io.to(recipient.socketId).emit('request-captions', { from: data.from });
    }
  });

  socket.on('stop-captions', (data) => {
    if (!data || !data.to) return;
    const recipient = onlineUsers.find((u) => u.userId === data.to);
    if (recipient && recipient.socketId) {
      io.to(recipient.socketId).emit('stop-captions', { from: data.from });
    }
  });

  socket.on("disconnect", () => {
    const user = onlineUsers.find((u) => u.socketId === socket.id); 
    if (user) {
      activeCalls.delete(user.userId); 

      for (const [key, value] of activeCalls.entries()) {
        if (value.with === user.userId) activeCalls.delete(key);
      }
    }

    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);

    io.emit("online-users", onlineUsers);

    socket.broadcast.emit("discounnectUser", { disUser: socket.id });

    console.log(`[INFO] Disconnected: ${socket.id}`); 
  });
});

(async () => {
  try {
    await dbConnect();
    server.listen(PORT, async () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1); 
  }
})();