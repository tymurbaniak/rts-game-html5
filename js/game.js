var game = {
    // Zaczynamy inicjalizowanie obiektów, wczytujemy zasoby i wyświetlamy ekran powitalny
    init: function () {
        // Inicjalizujemy obiekty gry
        loader.init();
        mouse.init();
        sidebar.init();
        sounds.init();
        // Wyświetlamy główne menu gry
        game.initCanvases();

        // Jeśli dostępny jest obiekt wAudio, automatycznie włączamy dźwięk na urządzeniu
        // mobilnym po pierwszym zdarzeniu dotyku użytkownika
        if (window.wAudio) {
            wAudio.mobileAutoEnable = true;
        }

        game.hideScreens();
        game.showScreen("gamestartscreen");
    },
    canvasWidth: 480,
    canvasHeight: 400,
    initCanvases: function () {
        game.backgroundCanvas = document.getElementById("gamebackgroundcanvas");
        game.backgroundContext = game.backgroundCanvas.getContext("2d");
        game.foregroundCanvas = document.getElementById("gameforegroundcanvas");
        game.foregroundContext = game.foregroundCanvas.getContext("2d");
        game.foregroundCanvas.width = game.canvasWidth;
        game.backgroundCanvas.width = game.canvasWidth;
        game.foregroundCanvas.height = game.canvasHeight;
        game.backgroundCanvas.height = game.canvasHeight;
    },
    hideScreens: function () {
        var screens = document.getElementsByClassName("gamelayer");
        // Iterujemy wszystkie warstwy gry i wyłączamy ich wyświetlanie
        for (let i = screens.length - 1; i >= 0; i--) {
            let screen = screens[i];
            screen.style.display = "none";
        }
    },
    hideScreen: function (id) {
        var screen = document.getElementById(id);
        screen.style.display = "none";
    },
    showScreen: function (id) {
        var screen = document.getElementById(id);
        screen.style.display = "block";
    },
    scale: 1,
    resize: function () {
        var maxWidth = window.innerWidth;
        var maxHeight = window.innerHeight;
        var scale = Math.min(maxWidth / 640, maxHeight / 480);
        var gameContainer = document.getElementById("gamecontainer");
        gameContainer.style.transform = "translate(-50%, -50%) " + "scale(" + scale + ")";

        // Znajdujemy maksymalną szerokość na podstawie bieżącej skali
        // i wybieramy wartość spomiędzy 640 i 1024
        var width = Math.max(640, Math.min(1024, maxWidth / scale));
        // Przypisujemy nową szerokość do kontenera gry i obiektu canvas gry
        gameContainer.style.width = width + "px";
        // Odejmujemy 160 pikseli na potrzeby paska bocznego
        var canvasWidth = width - 160;
        // Ustawiamy flagę w przypadku zmiany rozmiaru elementu canvas
        if (game.canvasWidth !== canvasWidth) {
            game.canvasWidth = canvasWidth;
            game.canvasResized = true;
        }

        // Ustawiamy tę samą wartość dla pola tekstowego chatmessage
        document.getElementById("chatmessage").style.width = canvasWidth + "px";

        game.scale = scale;
    },
    loadLevelData: function (level) {
        game.currentLevel = level;
        game.currentMap = maps[level.mapName];
        // Wczytujemy wszystkie zasoby poziomu, zaczynając od obrazu mapy
        game.currentMapImage = loader.loadImage("images/maps/" + maps[level.mapName].mapImage);
        // Inicjalizujemy wszystkie tablice potrzebne w grze
        game.resetArrays();
        // Wczytujemy wszystkie zasoby dla każdej encji zdefiniowanej w tablicy requirements poziomu
        for (let type in level.requirements) {
            let requirementArray = level.requirements[type];
            requirementArray.forEach(function (name) {
                if (window[type] && typeof window[type].load === "function") {
                    window[type].load(name);
                } else {
                    console.log("Nie można wczytać typu: ", type);
                }
            });
        }
        // Dodajemy do gry wszystkie elementy zdefiniowane w tablicy items poziomu
        level.items.forEach(function (itemDetails) {
            game.add(itemDetails);
        });
        game.cash = Object.assign({}, level.cash)
        sidebar.initRequirementsForLevel();
    },
    resetArrays: function () {
        // Licznik elementów dodanych do gry, potrzebny do przypisania im unikalnego identyfikatora
        game.counter = 0;
        // Śledzimy wszystkie elementy umieszczone w grze
        game.items = [];
        game.buildings = [];
        game.vehicles = [];
        game.aircraft = [];
        game.terrain = [];
        // Śledzimy wszystkie elementy zaznaczone przez gracza
        game.selectedItems = [];
        game.bullets = [];
    },
    add: function (itemDetails) {
        // Ustawiamy unikalny identyfikator elementu
        if (!itemDetails.uid) {
            itemDetails.uid = ++game.counter;
        }
        var item = window[itemDetails.type].add(itemDetails);
        // Dodajemy element do tablicy items
        game.items.push(item);
        // Dodajemy element do tablicy określonego typu
        game[item.type].push(item);

        // Resetujemy tablicę currentMapPassableGrid w przypadku dowolnej zmiany na mapie
        if (item.type === "buildings" || item.type === "terrain") {
            game.currentMapPassableGrid = undefined;
        }

        // Odtwarzamy dźwięk wystrzeliwania pocisku podczas jego tworzenia
        if (item.type === "bullets") {
            sounds.play(item.name);
        }

        return item;
    },
    remove: function (item) {
        // Usuwamy zaznaczenie elementu, o ile jest zaznaczony
        item.selected = false;
        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            if (game.selectedItems[i].uid === item.uid) {
                game.selectedItems.splice(i, 1);
                break;
            }
        }
        // Usuwamy element z tablicy items
        for (let i = game.items.length - 1; i >= 0; i--) {
            if (game.items[i].uid === item.uid) {
                game.items.splice(i, 1);
                break;
            }
        }
        // Usuwamy elementy z tablicy określonego typu
        for (let i = game[item.type].length - 1; i >= 0; i--) {
            if (game[item.type][i].uid === item.uid) {
                game[item.type].splice(i, 1);
                break;
            }
        }

        // Resetujemy tablicę currentMapPassableGrid w przypadku dowolnej zmiany na mapie
        if (item.type === "buildings" || item.type === "terrain") {
            game.currentMapPassableGrid = undefined;
        }
    },
    start: function () {
        // Wyświetlamy interfejs gry
        game.hideScreens();
        game.showScreen("gameinterfacescreen");
        game.running = true;
        game.refreshBackground = true;
        game.canvasResized = true;
        game.drawingLoop();
        // Czyścimy obszar komunikatów gry
        let gamemessages = document.getElementById("gamemessages");
        gamemessages.innerHTML = "";
        // Inicjalizujemy wszystkie wyzwalacze w grze
        game.currentLevel.triggers.forEach(function (trigger) {
            game.initTrigger(trigger);
        });
    },
    animationTimeout: 100, // 100 millisekund, czyli 10 razy na sekundę
    animationLoop: function () {
        sidebar.animate();
        game.items.forEach(function (item) {
            if (item.processOrders) {
                item.processOrders();
            }
        });
        // Animujemy wszystkie elementy znajdujące się w grze
        game.items.forEach(function (item) {
            item.animate();
        });
        // Sortujemy elementy gry do tablicy sortedItems na podstawie ich współrzędnych x,y
        game.sortedItems = Object.assign([], game.items);
        game.sortedItems.sort(function (a, b) {
            return a.y - b.y + ((a.y === b.y) ? (b.x - a.x) : 0);
        });
        fog.animate();

        // Zapisujemy czas, w którym zakończyła się ostatnia pętla animacji
        game.lastAnimationTime = Date.now();
    },
    // Mapa jest podzielona na kwadratowe kafelki o tym rozmiarze (20×20 pikseli)
    gridSize: 20,
    // Współrzędne X i Y przesunięcia mapy
    offsetX: 0,
    offsetY: 0,
    drawingLoop: function () {
        // Przesuwamy mapę, jeśli kursor znajduje się w pobliżu krawędzi obiektu canvas
        game.handlePanning();

        // Sprawdzamy czas od ostatniej animacji i liczymy liniowy współczynnik interpolacji (-1 do 0)
        game.lastDrawTime = Date.now();
        if (game.lastAnimationTime) {
            game.drawingInterpolationFactor = (game.lastDrawTime - game.lastAnimationTime) /
                game.animationTimeout - 1;
            // Nie ma sensu dokonywać interpolacji poza następną pętlą animacji…
            if (game.drawingInterpolationFactor > 0) {
                game.drawingInterpolationFactor = 0;
            }
        } else {
            game.drawingInterpolationFactor = -1;
        }
        // Rysujemy tło, zawsze gdy jest potrzebne
        game.drawBackground();
        // Wywołujemy pętlę rysowania dla następnej klatki za pomocą żądania klatki animacji
        // Czyścimy obiekt canvas pierwszego planu
        game.foregroundContext.clearRect(0, 0, game.canvasWidth, game.canvasHeight);
        // Zaczynamy rysowanie elementów pierwszego planu
        game.sortedItems.forEach(function (item) {
            item.draw();
        });
        // Rysujemy eksplodujące pociski na wierzchu pozostałych elementów
        game.bullets.forEach(function (bullet) {
            if (bullet.action === "explode") {
                bullet.draw();
            }
        });
        fog.draw();
        mouse.draw();
        if (game.running) {
            requestAnimationFrame(game.drawingLoop);
        }
    },
    drawBackground: function () {
        // Ponieważ rysowanie mapy tła jest kosztowną operacją
        // przerysowujemy tło, tylko jeśli się zmieni (ze względu na przesuwanie lub zmianę rozmiaru)
        if (game.refreshBackground || game.canvasResized) {
            if (game.canvasResized) {
                game.backgroundCanvas.width = game.canvasWidth;
                game.foregroundCanvas.width = game.canvasWidth;
                // Upewniamy się, że zmiana rozmiaru nie spowoduje przesunięcia mapy poza jej granice
                if (game.offsetX + game.canvasWidth > game.currentMapImage.width) {
                    game.offsetX = game.currentMapImage.width - game.canvasWidth;
                }
                if (game.offsetY + game.canvasHeight > game.currentMapImage.height) {
                    game.offsetY = game.currentMapImage.height - game.canvasHeight;
                }
                game.canvasResized = false;
            }
            game.backgroundContext.drawImage(game.currentMapImage, game.offsetX, game.offsetY, game.canvasWidth, game.canvasHeight, 0, 0, game.canvasWidth, game.canvasHeight);
            game.refreshBackground = false;
        }
    },
    // Odległość od krawędzi obiektu canvas, w miejscu rozpoczęcia przesuwania
    panningThreshold: 40,
    // Maksymalna odległość przesuwania w jednej pętli rysowania
    maximumPanDistance: 10,
    handlePanning: function () {
        // Nie przesuwamy, jeśli mysz znajdzie się poza obiektem canvas
        if (!mouse.insideCanvas) {
            return;
        }
        if (mouse.x <= game.panningThreshold) {
            // Kursor myszy znajduje się na lewej krawędzi obszaru gry. Przesuwamy w lewo.
            let panDistance = game.offsetX;
            if (panDistance > 0) {
                game.offsetX -= Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        } else if (mouse.x >= game.canvasWidth - game.panningThreshold) {
            // Kursor myszy znajduje się na prawej krawędzi obszaru gry. Przesuwamy w prawo.
            let panDistance = game.currentMapImage.width - game.canvasWidth - game.offsetX;
            if (panDistance > 0) {
                game.offsetX += Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        }
        if (mouse.y <= game.panningThreshold) {
            // Kursor myszy znajduje się na górnej krawędzi obszaru gry. Przesuwamy w górę.
            let panDistance = game.offsetY;
            if (panDistance > 0) {
                game.offsetY -= Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        } else if (mouse.y >= game.canvasHeight - game.panningThreshold) {
            // Kursor myszy znajduje się na dolnej krawędzi obszaru gry. Przesuwamy w dół.
            let panDistance = game.currentMapImage.height - game.offsetY - game.canvasHeight;
            if (panDistance > 0) {
                game.offsetY += Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        }
        if (game.refreshBackground) {
            // Uaktualniamy współrzędne kursora myszy na podstawie nowych wartości gry offsetX i offsetY
            mouse.calculateGameCoordinates();
        }
    },
    clearSelection: function () {
        while (game.selectedItems.length > 0) {
            game.selectedItems.pop().selected = false;
        }
    },
    selectItem: function (item, shiftPressed) {
        // Naciśnięcie klawisza Shift i kliknięcie zaznaczonego elementu spowoduje usunięcie jego zaznaczenia
        if (shiftPressed && item.selected) {
            // Usuwamy zaznaczenie elementu
            item.selected = false;
            for (let i = game.selectedItems.length - 1; i >= 0; i--) {
                if (game.selectedItems[i].uid === item.uid) {
                    game.selectedItems.splice(i, 1);
                    break;
                }
            }
            return;
        }
        if (item.selectable && !item.selected) {
            item.selected = true;
            game.selectedItems.push(item);
        }
    },
    // Wysyłamy polecenie do obiektu singleplayer lub multiplayer
    sendCommand: function (uids, details) {
        if (game.type === "singleplayer") {
            singleplayer.sendCommand(uids, details);
        } else {
            multiplayer.sendCommand(uids, details);
        }
    },
    getItemByUid: function (uid) {
        for (let i = game.items.length - 1; i >= 0; i--) {
            if (game.items[i].uid === uid) {
                return game.items[i];
            }
        }
    },
    // Otrzymujemy polecenie od obiektu singleplayer lub multiplayer i przesyłamy je do jednostek
    processCommand: function (uids, details) {
        // Jeśli docelowy obiekt ma szukane uid, pobieramy docelowy obiekt
        var toObject;
        if (details.toUid) {
            toObject = game.getItemByUid(details.toUid);
            if (!toObject || toObject.lifeCode === "dead") {
                // Obiekt docelowy już nie istnieje. Polecenie jest nieważne
                return;
            }
        }
        uids.forEach(function (uid) {
            let item = game.getItemByUid(uid);
            // Jeśli uid należy do poprawnego elementu, ustawiamy polecenie dla elementu
            if (item) {
                item.orders = Object.assign({}, details);
                if (toObject) {
                    item.orders.to = toObject;
                }
            }
        });
    },
    // Tworzenie siatki: liczba 1 oznacza kafelki, których nie można przejść, a 0 pozostałe
    createTerrainGrid: function () {
        let map = game.currentMap;
        // Inicjalizujemy siatkę terenu w postaci dwuwymiarowej tablicy wypełnionej zerami
        game.currentMapTerrainGrid = new Array(map.gridMapHeight);
        var row = new Array(map.gridMapWidth);
        for (let x = 0; x < map.mapGridWidth; x++) {
            row[x] = 0;
        }
        for (let y = 0; y < map.mapGridHeight; y++) {
            game.currentMapTerrainGrid[y] = row.slice(0);
        }
        // Pobieramy wszystkie współrzędne terenu, którego nie można przejść, i oznaczamy je na siatce terenu
        map.mapObstructedTerrain.forEach(function (obstruction) {
            game.currentMapTerrainGrid[obstruction[1]][obstruction[0]] = 1;
        }, this);
        // Resetujemy siatkę kafelków, po których można się poruszać
        game.currentMapPassableGrid = undefined;
    },
    // Tworzymy kopię dwuwymiarowej tablicy
    makeArrayCopy: function (originalArray) {
        var length = originalArray.length;
        var copy = new Array(length);
        for (let i = 0; i < length; i++) {
            copy[i] = originalArray[i].slice(0);
        }
        return copy;
    },
    rebuildPassableGrid: function () {
        // Inicjalizujemy siatkę wartościami z siatki terenu
        game.currentMapPassableGrid = game.makeArrayCopy(game.currentMapTerrainGrid);
        // Traktujemy budynki i encje terenu jako niedostępne miejsca
        for (let i = game.items.length - 1; i >= 0; i--) {
            var item = game.items[i];
            if (item.type === "buildings" || item.type === "terrain") {
                for (let y = item.passableGrid.length - 1; y >= 0; y--) {
                    for (let x = item.passableGrid[y].length - 1; x >= 0; x--) {
                        if (item.passableGrid[y][x]) {
                            game.currentMapPassableGrid[item.y + y][item.x + x] = 1;
                        }
                    }
                }
            }
        }
    },
    // Obraz profilu postaci gry
    characters: {
        "system": {
            "name": "System Control",
            "image": "system.png"
        },
        "op": {
            "name": "Operator",
            "image": "girl1.png"
        },
        "pilot": {
            "name": "Pilot",
            "image": "girl2.png"
        },
        "driver": {
            "name": "Driver",
            "image": "man1.png"
        }
    },
    showMessage: function (from, message) {
        sounds.play("message-received");

        let callerpicture = document.getElementById("callerpicture");
        let gamemessages = document.getElementById("gamemessages");
        // Jeśli komunikat pochodzi od zdefiniowanej postaci gry, wyświetlamy zdjęcie profilowe
        let character = game.characters[from];
        if (character) {
            // Korzystamy z nazwy postaci
            from = character.name;
            if (character.image) {
                // Wyświetlamy zdjęcie postaci w odpowiednim miejscu
                callerpicture.innerHTML = "<img src=\"images/characters/" + character.image + "\"/>";
                // Usuwamy zdjęcie po sześciu sekundach
                setTimeout(function () {
                    callerpicture.innerHTML = "";
                }, 6000);
            }
        }
        // Dołączamy wiadomość do panelu wiadomości i przewijamy w dół
        let messageHTML = "<span>" + from + ": </span>" + message + "<br>";
        gamemessages.innerHTML += messageHTML;
        gamemessages.scrollTop = gamemessages.scrollHeight;
    },
    rebuildBuildableGrid: function () {
        game.currentMapBuildableGrid = game.makeArrayCopy(game.currentMapTerrainGrid);
        game.items.forEach(function (item) {
            if (item.type === "buildings" || item.type === "terrain") {
                // Oznaczamy wszystkie kwadraty wykorzystywane przez budynek jako niedostępne do zabudowy
                for (let y = item.buildableGrid.length - 1; y >= 0; y--) {
                    for (let x = item.buildableGrid[y].length - 1; x >= 0; x--) {
                        if (item.buildableGrid[y][x]) {
                            game.currentMapBuildableGrid[item.y + y][item.x + x] = 1;
                        }
                    }
                }
            } else if (item.type === "vehicles") {
                // Oznaczamy wszystkie kwadraty znajdujące się pod lub obok pojazdów jako niedostępne do zabudowy
                let radius = item.radius / game.gridSize;
                let x1 = Math.max(Math.floor(item.x - radius), 0);
                let x2 = Math.min(Math.floor(item.x + radius), game.currentMap.mapGridWidth - 1);
                let y1 = Math.max(Math.floor(item.y - radius), 0);
                let y2 = Math.min(Math.floor(item.y + radius), game.currentMap.mapGridHeight - 1);
                for (let x = x1; x <= x2; x++) {
                    for (let y = y1; y <= y2; y++) {
                        game.currentMapBuildableGrid[y][x] = 1;
                    }
                }
            }
        });
    },
    messageBoxOkCallback: undefined,
    messageBoxCancelCallback: undefined,
    showMessageBox: function (message, onOK, onCancel) {
        // Ustawiamy tekst wiadomości
        let messageBoxText = document.getElementById("messageboxtext");
        messageBoxText.innerHTML = message.replace(/\n/g, "<br><br>");
        // Ustawiamy metodę obsługi onOK okna wiadomości
        if (typeof onOK === "function") {
            game.messageBoxOkCallback = onOK;
        } else {
            game.messageBoxOkCallback = undefined;
        }
        // Ustawiamy metodę obsługi zdarzenia onCancel, jeśli jest zdefiniowane, i wyświetlamy przycisk Anuluj
        let cancelButton = document.getElementById("messageboxcancel");
        if (typeof onCancel === "function") {
            game.messageBoxCancelCallback = onCancel;
            // Wyświetlamy przycisk Anuluj
            cancelButton.style.display = "";
        } else {
            game.messageBoxCancelCallback = undefined;
            // Ukrywamy przycisk Anuluj
            cancelButton.style.display = "none";
        }
        // Wyświetlamy okno wiadomości i czekamy, aż użytkownik kliknie przycisk
        game.showScreen("messageboxscreen");
    },
    messageBoxOK: function () {
        game.hideScreen("messageboxscreen");
        if (typeof game.messageBoxOkCallback === "function") {
            game.messageBoxOkCallback();
        }
    },
    messageBoxCancel: function () {
        game.hideScreen("messageboxscreen");
        if (typeof game.messageBoxCancelCallback === "function") {
            game.messageBoxCancelCallback();
        }
    },
    initTrigger: function (trigger) {
        if (trigger.type === "timed") {
            trigger.timeout = setTimeout(function () {
                game.runTrigger(trigger);
            }, trigger.time);
        } else if (trigger.type === "conditional") {
            trigger.interval = setInterval(function () {
                game.runTrigger(trigger);
            }, 1000);
        }
    },
    runTrigger: function (trigger) {
        if (trigger.type === "timed") {
            // Ponownie inicjalizujemy wyzwalacz na podstawie właściwości repeat
            if (trigger.repeat) {
                game.initTrigger(trigger);
            }
            // Wywołujemy akcję wyzwalacza
            trigger.action(trigger);
        } else if (trigger.type === "conditional") {
            // Sprawdzamy, czy warunek został spełniony
            if (trigger.condition()) {
                // Resetujemy wyzwalacz
                game.clearTrigger(trigger);
                // Wywołujemy akcję wyzwalacza
                trigger.action(trigger);
            }
        }
    },
    clearTrigger: function (trigger) {
        if (trigger.timeout !== undefined) {
            clearTimeout(trigger.timeout);
            trigger.timeout = undefined;
        }
        if (trigger.interval !== undefined) {
            clearInterval(trigger.interval);
            trigger.interval = undefined;
        }
    },
    end: function () {
        // Resetujemy wszystkie wyzwalacze w grze
        if (game.currentLevel.triggers) {
            for (var i = game.currentLevel.triggers.length - 1; i >= 0; i--) {
                game.clearTrigger(game.currentLevel.triggers[i]);
            }
        }
        game.running = false;
    },
    isItemDead: function (uid) {
        let item = game.getItemByUid(uid);
        return !item || item.lifeCode === "dead";
    },
    handleKeyboardInput: function (ev) {
        // Czatowanie jest dozwolone tylko w trybie multiplayer oraz podczas rozgrywki
        if (game.type === "multiplayer" && game.running) {
            let chatMessage = document.getElementById("chatmessage");
            // Niewidoczne elementy mają wartość null parametru offsetParent
            let chatInputVisible = chatMessage.offsetParent !== null;
            if (ev.key === "Enter") {
                if (chatInputVisible) {
                    // Wysyłamy tekst znajdujący się w polu tekstowym wiadomości
                    let message = chatMessage.value.trim();
                    if (message) {
                        multiplayer.sendChatMessage(message);
                    }
                    // Czyścimy pole tekstowe i ukrywamy je
                    chatMessage.value = "";
                    chatMessage.style.display = "none";
                } else {
                    // Wyświetlamy pole tekstowe i umieszczamy w nim kursor
                    chatMessage.style.display = "inline";
                    chatMessage.focus();
                }
            } else if (ev.key === "Escape") {
                if (chatInputVisible) {
                    // Czyścimy pole tekstowe i ukrywamy je
                    chatMessage.value = "";
                    chatMessage.style.display = "none";
                }
            }
        }
    },
};

window.addEventListener("load", function () {
    game.resize();
    game.init();
}, false);
// Zmiana rozmiaru gry po zmianie rozmiaru okna
window.addEventListener("resize", function () {
    game.resize();
});

window.addEventListener("keydown", game.handleKeyboardInput);