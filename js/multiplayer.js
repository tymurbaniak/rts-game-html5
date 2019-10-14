var multiplayer = {
    // Otwieramy lobby gry w trybie wielu graczy
    websocket: undefined,
    start: function () {
        if (!window.WebSocket) {
            game.showMessageBox("Twoja przeglądarka nie wspiera technologii WebSocket. Tryb wielu graczy nie zadziała.");
            return;
        }
        const websocketUrl = "ws://" + (window.location.hostname || "localhost") + ":8080";
        this.websocket = new WebSocket(websocketUrl);
        this.websocket.addEventListener("open", multiplayer.handleWebSocketOpen);
        this.websocket.addEventListener("message", multiplayer.handleWebSocketMessage);
        this.websocket.addEventListener("close", multiplayer.handleWebSocketConnectionError);
        this.websocket.addEventListener("error", multiplayer.handleWebSocketConnectionError);

    },
    handleWebSocketConnectionError: function () {
        multiplayer.endGame("Błąd połączenia z serwerem trybu wielu graczy.");
    },
    // Wyświetlamy ekran lobby trybu wielu graczy po otwarciu połączenia
    handleWebSocketOpen: function () {
        game.hideScreens();
        game.showScreen("multiplayerlobbyscreen");
    },
    handleWebSocketMessage: function (message) {
        var messageObject = JSON.parse(message.data);
        switch (messageObject.type) {
            case "room-list":
                multiplayer.updateRoomStatus(messageObject.roomList);
                break;

            case "joined-room":
                multiplayer.roomId = messageObject.roomId;
                multiplayer.color = messageObject.color;
                break;
            case "initialize-level":
                multiplayer.currentLevel = messageObject.currentLevel;
                multiplayer.initLevel(messageObject.spawnLocations);
                break;
            case "play-game":
                multiplayer.play();
                break;
            case "latency-ping":
                multiplayer.sendWebSocketMessage({
                    type: "latency-pong"
                });
                break;
            case "game-tick":
                multiplayer.lastReceivedTick = messageObject.tick;
                multiplayer.commands[messageObject.tick] = messageObject.commands;
                break;
            case "end-game":
                multiplayer.endGame(messageObject.message);
                break;
            case "chat":
                game.showMessage(messageObject.from, messageObject.message);
                break;
        }
    },
    statusMessages: {
        "starting": "Game Starting",
        "running": "Game in Progress",
        "waiting": "Waiting for players",
        "empty": "Open"
    },
    selectRow: function (index) {
        var list = document.getElementById("multiplayergameslist");
        // Usuwamy wszystkie zaznaczone wiersze
        for (let i = list.rows.length - 1; i >= 0; i--) {
            let row = list.rows[i];
            row.classList.remove("selected");
        }
        list.selectedIndex = index;
        let row = list.rows[index];
        list.value = row.cells[0].value;
        row.classList.add("selected");
    },
    updateRoomStatus: function (roomList) {
        var list = document.getElementById("multiplayergameslist");
        // Czyścimy wszystkie dawne opcje
        for (let i = list.rows.length - 1; i >= 0; i--) {
            list.deleteRow(i);
        }
        roomList.forEach(function (status, index) {
            let statusMessage = multiplayer.statusMessages[status];
            let roomId = index + 1;
            let label = "Game " + roomId + ". " + statusMessage;
            // Tworzymy nową opcję dla pokoju
            let row = document.createElement("tr");
            let cell = document.createElement("td");
            cell.innerHTML = label;
            cell.value = roomId;
            row.appendChild(cell);
            row.addEventListener("click", function () {
                if (!list.disabled && !row.disabled) {
                    multiplayer.selectRow(index);
                }
            });
            row.className = status;
            list.appendChild(row);
            // Wyłączamy pokoje, które są w trakcie gry lub jej rozpoczęcia
            if (status === "running" || status === "starting") {
                row.disabled = true;
            }
            // Jeśli ustawiona jest wartość multiplayer.roomId, zaznaczamy pokój o identyfikatorze
            // roomId i usuwamy zaznaczenie pozostałych
            if (multiplayer.roomId === roomId) {
                this.selectRow(index);
            }
        }, this);
    },
    join: function () {
        var selectedRoom = document.getElementById("multiplayergameslist").value;
        if (selectedRoom) {
            // Jeśli pokój został zaznaczony, próbujemy do niego dołączyć
            multiplayer.sendWebSocketMessage({
                type: "join-room",
                roomId: selectedRoom
            });
            // Deaktywujemy listę pokojów i przycisk Join
            document.getElementById("multiplayergameslist").disabled = true;
            document.getElementById("multiplayerjoin").disabled = true;
        } else {
            // W przeciwnym razie prosimy gracza o wybranie pokoju
            game.showMessageBox("Prosimy o wybranie pokoju gry.");
        }
    },
    cancel: function () {
        if (multiplayer.roomId) {
            // Jeśli gracz znajduje się w pokoju, przycisk Anuluj spowoduje opuszczenie pokoju
            multiplayer.sendWebSocketMessage({
                type: "leave-room",
                roomId: multiplayer.roomId
            });
            document.getElementById("multiplayergameslist").disabled = false;
            document.getElementById("multiplayerjoin").disabled = false;
            // Czyścimy roomId i color
            delete multiplayer.roomId;
            delete multiplayer.color;
        } else {
            // Jeśli gracza nie ma w pokoju, opuszczamy sam ekran trybu wielu graczy
            multiplayer.closeAndExit();
        }
    },
    closeAndExit: function () {
        // Czyścimy wszystkie funkcje obsługi zdarzeń i zamykamy połączenie
        multiplayer.websocket.removeEventListener("open", multiplayer.handleWebSocketOpen);
        multiplayer.websocket.removeEventListener("message", multiplayer.handleWebSocketMessage);
        multiplayer.websocket.removeEventListener("close", multiplayer.handleWebSocketConnectionError);
        multiplayer.websocket.removeEventListener("error", multiplayer.handleWebSocketConnectionError);
        multiplayer.websocket.close();
        // Aktywujemy listę pokojów oraz przycisk Join
        document.getElementById("multiplayergameslist").disabled = false;
        document.getElementById("multiplayerjoin").disabled = false;
        // Wyświetlamy warstwę menu początkowego
        game.hideScreens();
        game.showScreen("gamestartscreen");
    },
    sendWebSocketMessage: function (messageObject) {
        var messageString = JSON.stringify(messageObject);
        this.websocket.send(messageString);
    },
    currentLevel: 0,
    initLevel: function (spawnLocations) {
        game.type = "multiplayer";
        game.team = multiplayer.color;
        // Wczytujemy wszystkie elementy dla poziomu
        var level = levels.multiplayer[multiplayer.currentLevel];
        game.loadLevelData(level);
        fog.initLevel();
        // Inicjalizujemy zmienne dotyczące trybu wielu graczy
        multiplayer.commands = [
            []
        ];
        multiplayer.lastReceivedTick = 0;
        multiplayer.currentTick = 0;
        // Dodajemy początkowe elementy dla obydwu zespołów w ich odpowiednich pozycjach startowych
        for (let team in spawnLocations) {
            let spawnIndex = spawnLocations[team];
            for (let i = 0; i < level.teamStartingItems.length; i++) {
                let itemDetails = Object.assign({}, level.teamStartingItems[i]);
                // Umieszczamy element w pozycji startowej
                itemDetails.x += level.spawnLocations[spawnIndex].x;
                itemDetails.y += level.spawnLocations[spawnIndex].y;
                itemDetails.team = team;
                game.add(itemDetails);
            }
        }
        // Umieszczamy bieżącego gracza w odpowiedniej pozycji początkowej
        let spawnIndex = spawnLocations[game.team];
        game.offsetX = level.spawnLocations[spawnIndex].startX * game.gridSize;
        game.offsetY = level.spawnLocations[spawnIndex].startY * game.gridSize;
        game.createTerrainGrid();
        // Informujemy serwer o wczytaniu wszystkich zasobów
        loader.onload = function () {
            multiplayer.sendWebSocketMessage({
                type: "initialized-level"
            });
        };
    },
    play: function () {
        // Uruchamiamy jeden raz pętlę animacji
        game.animationLoop();
        multiplayer.animationInterval = setInterval(multiplayer.tickLoop, game.animationTimeout);
        game.start();
    },
    sendCommand: function (uids, details) {
        multiplayer.sentCommandForTick = true;
        multiplayer.sendWebSocketMessage({
            type: "command",
            uids: uids,
            details: details,
            currentTick: multiplayer.currentTick
        });
    },
    tickLoop: function () {
        // Jeśli otrzymano polecenia dla tego tyknięcia
        // Wykonujemy polecenia i przechodzimy do następnego tyknięcia
        // W przeciwnym razie czekamy aż serwer nadgoni
        if (multiplayer.currentTick <= multiplayer.lastReceivedTick) {
            var commands = multiplayer.commands[multiplayer.currentTick];
            if (commands) {
                for (var i = 0; i < commands.length; i++) {
                    game.processCommand(commands[i].uids, commands[i].details);
                }
            }
            game.animationLoop();
            // Jeśli dla bieżącego tyknięcia nie zostało wysłane żadne polecenie, wysyłamy puste polecenie do serwera
            // Aby serwer wiedział, że wszystko działa płynnie
            if (!multiplayer.sentCommandForTick) {
                multiplayer.sendCommand();
            }
            // Przechodzimy do następnego tyknięcia
            multiplayer.currentTick++;
            multiplayer.sentCommandForTick = false;
        }
    },
    loseGame: function (team) {
        multiplayer.sendWebSocketMessage({
            type: "lose-game",
            loser: team
        });
    },
    endGame: function (message) {
        game.running = false;
        clearInterval(multiplayer.animationInterval);
        // Wyświetlamy informację o powodzie zakończenia gry, a gdy gracz kliknie Ok, wychodzimy z ekranu trybu wielu graczy
        game.showMessageBox(message, multiplayer.closeAndExit);
    },
    sendChatMessage: function (message) {
        multiplayer.sendWebSocketMessage({
            type: "chat",
            message: message
        });
    }
};