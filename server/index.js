// importing modules
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const Room = require('./models/room');
console.log("hello");
//hide the url in .env file
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000; 
var server = http.createServer(app);

var io = require('socket.io')(server);

app.use(express.json());

const DB = process.env.URL;
// DB connection

io.on("connection", (socket) => {
    console.log("connected!");
    socket.on("createRoom", async ({ nickname }) => {
        try {
            console.log(nickname);
            // room is created
            let room = new Room();
            let player = {
                socketID: socket.id,
                nickname: nickname,
                playerType: "X"
            };
            room.players.push(player);
            room.turn = player; 
            room = await room.save();
            console.log(room);
            // _id
            const roomId = room._id.toString();
            socket.join(roomId); 
            io.to(roomId).emit("createRoomSuccess", room);
        }
        catch (err) {
            console.log(err);
        }

    });

    socket.on("joinRoom", async ({ nickname, roomId }) => {
        try {
            if (!roomId.match(/^[0-9a-fA-F]{24}$/)) {
                socket.emit("errorOccurred", "Please enter a valid room ID.");
                return;
            }
            let room = await Room.findById(roomId);

            if (room.isJoin) {
                let player = {
                    nickname,
                    socketID: socket.id,
                    playerType: "O",
                };
                socket.join(roomId);
                room.players.push(player);
                room.isJoin = false;
                room = await room.save();
                io.to(roomId).emit("joinRoomSuccess", room);
                io.to(roomId).emit("updatePlayers", room.players);
                io.to(roomId).emit("updateRoom", room);



            } else {
                socket.emit(
                    "errorOccurred",
                    "The game is in progress, try again later."
                );
            }
        } catch (e) {
            console.log(e);
        }
    });


    socket.on('tap', async ({ index, roomId }) => {
        try {
            let room = await Room.findById(roomId);

            let choice = room.turn.playerType; // x or o

            if (room.turnIndex == 0) {
                room.turn = room.players[1];
                room.turnIndex = 1;
            }
            else {
                room.turn = room.players[0];
                room.turnIndex = 0;
            }
            room = await room.save();
            io.to(roomId).emit('tapped', { index, choice, room });

        } catch (e) {
            console.log(e);
        }
    });

    socket.on('winner', async ({ winnerSocketId, roomId }) => {
        try {
            let room = await Room.findById(roomId);
            console.log("dikkat");
            console.log(room.players);
            console.log(winnerSocketId);
            let player = room.players.find((playerr) => playerr.socketID == winnerSocketId);
            console.log(player);
            player.points += 1;
            room = await room.save();

            if (player.points >= room.maxRounds) {
                io.to(roomId).emit('endGame', player);
            }
            else {
                io.to(roomId).emit("pointIncrease", player);
            }
        }
        catch (e) {
            console.log(e);
        }
    });

});


mongoose.connect(DB).then(() => {
    console.log("Connection successful !")
}).catch((e) => {
    console.log(e)
});

server.listen(port,() => {
    console.log(`Server is up on port ${port}`);
}); 


//test commit again