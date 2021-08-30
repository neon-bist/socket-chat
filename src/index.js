const express = require("express")
const path = require("path");
const router = express.Router();
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server)
const port =8800;
const users={};
const rooms={};
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname,"../public")))
app.use("/", router)
server.listen(port, ()=>console.log("Listening on "+port) )

io.on("connection", (socket)=>{
  console.log("New connection established", socket.id);
  socket.emit('heartbeat',{status:"ok"});
  socket.on('setname',({username})=>{
    if(!username) {
      socket.emit('status',{status:"Please set the unique \`username\` first"});
      return;}
    socket.join(username);
    if(username in users) {
      socket.emit('gotAllMessages',{messages:users[username].messages, status:"Fetched all messages of "+username})
    }
    else users[username]={messages:[]}
  });


  socket.on("send-msg",(data)=>{
    const sender = data.username;
    const receiver = data.to;
    if(receiver in users){
      users[sender].messages.push(data.username+ "  =>  "+ data.msg)
      users[receiver].messages.push(data.username+ "  =>  "+ data.msg)
      io.to(sender).to(receiver).emit('populate',data)
    }else if(receiver in rooms){
      rooms[receiver].messages.push(data.username+ "  =>  "+ data.msg)
      io.to(receiver).emit('populate',data)
    }
    else socket.emit('status',{status:"Receiver not found "})
    
  });
  socket.on('leave-room',({roomName})=>{
    if(roomName in rooms) return;
    socket.leave(roomName);
    socket.emit('status',{status:"room "+roomName+' is Unsubscribed.'})
  })

  socket.on('join-room',({roomName})=>{
    if(roomName in rooms) {
    console.log("room ",roomName,' is JOINED');
    socket.join(roomName)
    socket.emit('gotAllMessages',{messages:rooms[roomName].messages, status:"Fetched all messages of ROOM "+roomName})
    }else socket.emit('status',{status:"Room not found"})
  })

  socket.on('create-room',({roomName})=>{
    if(roomName in rooms) {
      console.log("Room Already Exists");
      return;
    };
    rooms[roomName]={messages:[]}
   socket.emit('gotAllMessages',{messages:rooms[roomName].messages, status:"room "+roomName+' is CREATED' })
  })
})