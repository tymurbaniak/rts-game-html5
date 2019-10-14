// Tworzenie serwera HTTP
var http = require("http");
// Tworzymy prosty serwer WWW, który zwraca tę samą odpowiedź dla każdego żądania
var server = http.createServer(function (request, response) {
    console.log("Otrzymano żądanie HTTP dla adresu URL", request.url);
    response.writeHead(200, {
        "Content-Type": "text/plain"
    });
    response.end("To jest prosty serwer HTTP w node.js.");
});
// Nasłuchujemy na porcie 8080
server.listen(8080, function () {
    console.log("Serwer rozpoczął nasłuchiwanie na porcie 8080");
});

// Dołączanie serwera WebSocket do serwera HTTP
var WebSocketServer = require("websocket").server;
var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});
// Inicjalizujemy zbiór 10 pokojów
var gameRooms = [];
for (var i = 0; i < 10; i++) {
    gameRooms.push({
        status: "empty",
        players: [],
        roomId: i + 1
    });
}
// Zapisujemy wszystkich graczy połączonych obecnie z serwerem
var players = [];
wsServer.on("request", function (request) {
    var connection = request.accept();
    console.log("Zaakceptowano połączenie z " + request.remoteAddress);
    // Dodajemy gracza do tablicy players
    var player = {
        connection: connection,
        latencyTrips: []
    };
    players.push(player);
    // Wysyłamy nową listę stanów pokojów gry do pierwszego gracza, który się połączy
    sendRoomList(connection);
    measureLatencyStart(player);
    // Obsługujemy wiadomości przychodzące
    connection.on("message", function (message) {
        if (message.type === "utf8") {
            var clientMessage = JSON.parse(message.utf8Data);
            // Przetwarzamy wiadomość na podstawie jej typu
            switch (clientMessage.type) {
                case "join-room":
                    joinRoom(player, clientMessage.roomId);
                    sendRoomListToEveryone();
                    if (player.room.players.length === 3) {
                        // Dołączyło dwóch graczy. Inicjalizowanie gry
                        initializeGame(player.room);
                    }
                    break;
                case "leave-room":
                    leaveRoom(player, clientMessage.roomId);
                    sendRoomListToEveryone();
                    break;
                case "initialized-level":
                    player.room.playersReady++;
                    if (player.room.playersReady === 3) {
                        // Obydwaj gracze są gotowi, rozpoczynamy grę
                        startGame(player.room);
                    }
                    break;
                case "latency-pong":
                    measureLatencyEnd(player);
                    // Dokonujemy pomiaru co najmniej trzy razy
                    if (player.latencyTrips.length < 3) {
                        measureLatencyStart(player);
                    }
                    break;
                case "command":
                    if (player.room && player.room.status === "running") {
                        if (clientMessage.uids) {
                            player.room.commands.push({
                                uids: clientMessage.uids,
                                details: clientMessage.details
                            });
                        }
                        player.room.lastTickConfirmed[player.color] = clientMessage.
                        currentTick + player.tickLag;
                    }
                    break;
                case "lose-game":
                    if (player.room && player.room.status === "running") {
                        endGame(player.room, " Zespół " + player.color + " został pokonany.");
                    }
                    break;
                case "chat":
                    if (player.room && player.room.status === "running") {
                        // Czyścimy wiadomość, usuwając wszystkie znaczniki HTML
                        var cleanedMessage = clientMessage.message.replace(/[<>]/g, "");
                        sendRoomWebSocketMessage(player.room, {
                            type: "chat",
                            from: player.color,
                            message: cleanedMessage
                        });
                    }
                    break;
            }
        }
    });
    // Obsługa zamykania połączenia
    connection.on("close", function () {
        console.log("Zamknięto połączenie z " + request.remoteAddress);
        // Usuwamy gracza z tablicy players
        var index = players.indexOf(player);
        if (index > -1) {
            players.splice(index, 1);
        }

        var room = player.room;
        if (room) {
            var status = room.status;
            // Jeśli gracz znajdował się w pokoju, usuwamy go z pokoju
            leaveRoom(player, room.roomId);
            // Jeśli gra rozpoczęła się lub była w trakcie działania, kończymy grę i informujemy drugiego gracza
            if (status === "running" || status === "starting") {
                var message = "Gracz " + player.color + " rozłączył się.";
                endGame(room, message);
            }
            // Powiadamiamy wszystkich o zmianie
            sendRoomListToEveryone();
        }
    });
});

function getRoomListMessageString() {
    var roomList = [];
    for (var i = 0; i < gameRooms.length; i++) {
        roomList.push(gameRooms[i].status);
    }
    var message = {
        type: "room-list",
        roomList: roomList
    };
    var messageString = JSON.stringify(message);
    return messageString;
}

function sendRoomList(connection) {
    var messageString = getRoomListMessageString();
    connection.send(messageString);
}

function sendRoomListToEveryone() {
    var messageString = getRoomListMessageString();
    // Powiadamiamy wszystkich połączonych graczy o zmianie stanu pokoju
    players.forEach(function (player) {
        player.connection.send(messageString);
    });
}

function joinRoom(player, roomId) {
    var room = gameRooms[roomId - 1];
    console.log("Dodawanie gracza do pokoju ", roomId);
    // Dodajemy gracza do pokoju
    room.players.push(player);
    player.room = room;
    // Uaktualniamy stan pokoju i wybieramy kolor gracza (niebieski dla pierwszego gracza, a zielony dla drugiego)
    if (room.players.length === 1) {
        room.status = "waiting";
        player.color = "blue";
    } else if (room.players.length === 2) {
        room.status = "waiting";
        player.color = "green";
    } else if (room.players.length === 3){
        room.status = "starting";
        player.color = "red";
    }
    // Informujemy gracza, że został dodany
    var confirmationMessage = {
        type: "joined-room",
        roomId: roomId,
        color: player.color
    };
    var confirmationMessageString = JSON.stringify(confirmationMessage);
    player.connection.send(confirmationMessageString);
    return room;
}

function leaveRoom(player, roomId) {
    var room = gameRooms[roomId - 1];
    console.log("Usuwanie gracza z pokoju ", roomId);
    // Usuwamy gracza z tablicy players
    var index = room.players.indexOf(player);
    if (index > -1) {
        room.players.splice(index, 1);
    }
    delete player.room;
    // Uaktualniamy stan pokoju
    if (room.players.length === 0) {
        room.status = "empty";
    } else if (room.players.length === 1) {
        room.status = "waiting";
    }
}

function initializeGame(room) {
    console.log("Dołączyli trzej gracze. Inicjalizowanie gry dla pokoju " + room.roomId);
    // Liczba graczy, którzy wczytali poziom
    room.playersReady = 0;
    // Wczytujemy pierwszy poziom u obydwu graczy
    // Ta logika może się później zmienić, aby umożliwić graczom wybór poziomu
    var currentLevel = 0;
    // Losowo wybieramy dwie pozycje początkowe z zakresu od 0 do 3 dla obydwu graczy
    var spawns = [0, 1, 2, 3];
    var spawnLocations = {
        "blue": spawns.splice(Math.floor(Math.random() * spawns.length),
            1),
        "green": spawns.splice(Math.floor(Math.random() * spawns.length), 1),
        "red": spawns.splice(Math.floor(Math.random() * spawns.length), 1)
    };
    sendRoomWebSocketMessage(room, {
        type: "initialize-level",
        spawnLocations: spawnLocations,
        currentLevel: currentLevel
    });
}

function startGame(room) {
    console.log("Wszyscy gracze są gotowi. Rozpoczynamy grę w pokoju ", room.roomId);
    room.status = "running";
    sendRoomListToEveryone();
    // Powiadamiamy graczy o możliwości rozpoczęcia
    sendRoomWebSocketMessage(room, {
        type: "play-game"
    });
    room.commands = [];
    room.lastTickConfirmed = {
        "blue": 0,
        "green": 0,
        "red": 0
    };
    room.currentTick = 0;
    // Obliczamy opóźnienie tyknięć dla pokoju, wybierając maksymalną wartość tego opóźnienia dla graczy
    var roomTickLag = Math.max(room.players[0].tickLag, room.players[1].tickLag, room.players[2].tickLag);
    room.interval = setInterval(function () {
        // Potwierdzamy, że obydwaj gracze wysłali polecenia aż do bieżącego tyknięcia
        if (room.lastTickConfirmed["blue"] >= room.currentTick && 
            room.lastTickConfirmed["green"] >= room.currentTick &&
            room.lastTickConfirmed["red"] >= room.currentTick) {
            // Polecenia należy wykonać po opóźnieniu tyknięcia
            sendRoomWebSocketMessage(room, {
                type: "game-tick",
                tick: room.
                currentTick + roomTickLag,
                commands: room.commands
            });
            room.currentTick++;
            room.commands = [];
        } else {
            // Jeden z graczy jest przyczyną opóźnień w grze. Należy wykryć ten przypadek
            if (room.lastTickConfirmed["blue"] < room.currentTick) {
                console.log("Pokój ", room.roomId, "Tik:", room.currentTick, " zespołu niebieskiego jest opóźniony o ", room.currentTick - room.lastTickConfirmed["blue "]);
            }
            if (room.lastTickConfirmed["green"] < room.currentTick) {
                console.log("Pokój ", room.roomId, "Tik:", room.currentTick, " zespołu zielonego jest opóźniony o ", room.currentTick - room.lastTickConfirmed["green "]);
            }
            if (room.lastTickConfirmed["red"] < room.currentTick) {
                console.log("Pokój ", room.roomId, "Tik:", room.currentTick, " zespołu czerwonego jest opóźniony o ", room.currentTick - room.lastTickConfirmed["red "]);
            }
        }
    }, gameTimeout);
}

function sendRoomWebSocketMessage(room, messageObject) {
    var messageString = JSON.stringify(messageObject);
    room.players.forEach(function (player) {
        player.connection.send(messageString);
    });
}

function measureLatencyStart(player) {
    var measurement = {
        start: Date.now()
    };
    player.latencyTrips.push(measurement);
    var clientMessage = {
        type: "latency-ping"
    };
    player.connection.send(JSON.stringify(clientMessage));
}

// Zegar gry będzie tykać z częstotliwością 100 milisekund
var gameTimeout = 100;

function measureLatencyEnd(player) {
    // Obliczenia dla bieżącego pomiaru
    var currentMeasurement = player.latencyTrips[player.latencyTrips.length - 1];
    currentMeasurement.end = Date.now();
    currentMeasurement.roundTrip = currentMeasurement.end - currentMeasurement.start;
    // Obliczamy dotychczasową średnią podróży tam i z powrotem
    var totalTime = 0;
    player.latencyTrips.forEach(function (measurement) {
        totalTime += measurement.roundTrip;
    });
    player.averageRoundTrip = totalTime / player.latencyTrips.length;
    // Domyślnie polecenia gry są wykonywane po jednym tyknięciu od ich otrzymania przez serwer
    player.tickLag = 1;
    // Jeśli wartość averageRoundTrip jest większa niż gameTimeout, zwiększamy tickLag, aby uwzględnić opóźnienie
    player.tickLag += Math.round(player.averageRoundTrip / gameTimeout);
    console.log("Pomiar opóźnienia dla gracza. Próba", player.latencyTrips.length, "- Średnia dla drogi tam i z powrotem:", player.averageRoundTrip + "ms", "Opóźnienie tyknięcia:", player.tickLag);
}

function endGame(room, message) {
    // Zatrzymujemy pętlę gry na serwerze
    clearInterval(room.interval);
    // Informujemy obydwu graczy o zakończeniu gry
    sendRoomWebSocketMessage(room, {
        type: "end-game",
        message: message
    });
    // Opróżniamy pokój
    room.players.forEach(function (player) {
        leaveRoom(player, room.roomId);
    });
    room.status = "empty";
    sendRoomListToEveryone();
}