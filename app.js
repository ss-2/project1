var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req,res){
	res.sendFile(__dirname+'/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log('Server started');
var SOCKET_LIST = {};
var gameState = 'lobby'; //switch between lobby, waitingForAnswers, calcScores, endOfRound, endofGame

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	socket.score = 0;
	socket.name = 'Player ' + socket.id;
	socket.answer = '';
	socket.ready = false;
	SOCKET_LIST[socket.id] = socket;
	
	console.log('socket connection');
	
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
	});
	
	socket.on('setName',function(data){
		socket.name = data;
		console.log('Player changed name to ' + socket.name);
		socket.ready = true;
	});
	
	socket.on('submitAnswer',function(data){
		//check if given answer has already been submitted
		for(var i in SOCKET_LIST){
			if(data == SOCKET_LIST[i].answer){
				socket.emit('answerTaken', data);
			}
		}
	});
});

function newPrompt(){
	//create new prompt
	var data = Math.random();
	//send out prompt
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPrompt',data);
	}
}

//update 6 times a second
setInterval(function(){
	switch(gameState){
		case 'lobby':
			//switch state
			var allPlayersAreReady = false;
			for(var i in SOCKET_LIST){
				var socket = SOCKET_LIST[i];
				if(socket.ready === true){
					allPlayersAreReady = true;
				}
			}
			if(allPlayersAreReady){
				gameState = 'endOfRound';
			}
			break;
		case 'waitingForAnswers':
			//check if all players have submitted an answer
			var haveAllAnswers = true;
			for(var i in SOCKET_LIST){
				var socket = SOCKET_LIST[i];
				if(socket.answer == ''){
					haveAllAnswers = false;
				}
			}
			if(haveAllAnswers){
				//switch state
				gameState = 'calcScores';
				console.log('Switched to calc scores state');
			}
			break;
		case 'calcScores':
			break;
		case 'endOfRound':
			//switch state and send out prompt
			gameState = 'waitingForAnswers';
			console.log('Switched to waiting for answers state');
			newPrompt();
			break;
		case 'endOfGame':
			break;
	}
},1000/6);