var socketio = require('socket.io');
var io;
var guestNumber =1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server){
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket){
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		joinRoom(socket, 'Lobby');
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		socket.on('rooms', function(){
			socket.emit('rooms', io.sockets.manager.rooms)
		});

		handleClientDisconnection(socket, nickNames, namesUsed);
	})
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed){
	var name = 'Guest' + guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber+1;
}

function joinRoom(socket, room){
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {
		room: room
	});

	socket.broadcrast.to(room).emit('message', {
		text: nickNames[socket.id] + 'has joined ' + room + '.'
	});

	var usersInRoom = io.sockets.clients(room);

	//all this is doing is broadcasting a message to all other users saying who is in the room. Can be way simpler.
	if(usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ':';
		for(var user in usersInRoom){
			var userSocketId = usersInRoom[user].id;

			if(userSocketId != socket.id){
				if(index > 0){
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}

		usersInRoomSummary += '.';
		socket.emit('message', {
			text: usersInRoomSummary
		});
	}
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
	socket.on('nameAttempt', function(name){
		if(name.indexOf('Guest')==0){
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest"'
			});
		}else{
			if(namesUsed.indexOf(name) == -1){
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];

				socket.emit('nameResult', {
					success: true,
					name: name
				});

				socket.broadcast.to(currentRoom[socket.id].emit('message',{
					text: previousName + ' is now known as ' + name + '.';
				}))
			}else{
				socket.emit('nameResult',{
					success: false,
					message: 'That name aleady exists.'
				})
			}
		}
	})
}

function handleMessageBroadcasting(socket){
	socket.on('message', function(message){
		socket.broadcast.to(currentRoom[socket.id].emit('message',{
			text: nickNamesp[socket.id] + ': ' + message.text
		})
	})
}