var mouse = {
    init: function () {
        // Oczekujemy na zdarzenia myszy przechwytywane przez obiekt canvas znajdujący się na pierwszym planie
        let canvas = document.getElementById("gameforegroundcanvas");
        canvas.addEventListener("mousemove", mouse.mousemovehandler, false);
        canvas.addEventListener("mouseenter", mouse.mouseenterhandler, false);
        canvas.addEventListener("mouseout", mouse.mouseouthandler, false);
        canvas.addEventListener("mousedown", mouse.mousedownhandler, false);
        canvas.addEventListener("mouseup", mouse.mouseuphandler, false);
        canvas.addEventListener("contextmenu", mouse.mouserightclickhandler, false);
        canvas.addEventListener("touchstart", mouse.touchstarthandler, {
            passive: false
        });
        canvas.addEventListener("touchend", mouse.touchendhandler, {
            passive: false
        });
        canvas.addEventListener("touchmove", mouse.touchmovehandler, {
            passive: false
        });
        mouse.canvas = canvas;
    },
    // Współrzędne x,y myszy względem górnego lewego rogu obiektu canvas
    x: 0,
    y: 0,
    // Współrzędne x,y względem górnego lewego rogu mapy gry
    gameX: 0,
    gameY: 0,
    // Współrzędne x,y myszy na siatce gry
    gridX: 0,
    gridY: 0,
    calculateGameCoordinates: function () {
        mouse.gameX = mouse.x + game.offsetX;
        mouse.gameY = mouse.y + game.offsetY;
        mouse.gridX = Math.floor((mouse.gameX) / game.gridSize);
        mouse.gridY = Math.floor((mouse.gameY) / game.gridSize);
    },
    setCoordinates: function (clientX, clientY) {
        let offset = mouse.canvas.getBoundingClientRect();
        mouse.x = (clientX - offset.left) / game.scale;
        mouse.y = (clientY - offset.top) / game.scale;
        mouse.calculateGameCoordinates();
    },
    // Sprawdzamy, czy kursor myszy znajduje w obrębie obiektu canvas
    insideCanvas: false,
    mousemovehandler: function (ev) {
        mouse.insideCanvas = true;
        mouse.setCoordinates(ev.clientX, ev.clientY);
        mouse.checkIfDragging();
    },
    // Czy gracz przeciąga i zaznacza po naciśnięciu lewego przycisku myszy
    dragSelect: false,
    // Jeśli mysz zostanie przeciągnięta o większą odległość, zakładamy, że gracz próbuje coś zaznaczyć
    dragSelectThreshold: 5,
    checkIfDragging: function () {
        if (mouse.buttonPressed && !sidebar.deployBuilding) {
            // Jeśli mysz zostanie przeciągnięta o więcej niż wartość graniczna, traktujemy to jako przeciągnięcie
            if ((Math.abs(mouse.dragX - mouse.gameX) > mouse.dragSelectThreshold && Math.abs(mouse.dragY - mouse.gameY) > mouse.dragSelectThreshold)) {
                mouse.dragSelect = true;
            }
        } else {
            mouse.dragSelect = false;
        }
    },
    mouseenterhandler: function () {
        mouse.insideCanvas = true;
    },
    mouseouthandler: function () {
        mouse.insideCanvas = false;
    },
    // Metoda wywoływana, gdy gracz kliknie obszar canvas lewym przyciskiem myszy
    leftClick: function (shiftPressed) {
        if (sidebar.deployBuilding) {
            if (sidebar.canDeployBuilding) {
                sidebar.finishDeployingBuilding();
            } else {
                game.showMessage("system", "Ostrzeżenie! Tutaj nie można zbudować budynku.");
            }
            return;
        }
        let clickedItem = mouse.itemUnderMouse();
        if (clickedItem) {
            // Naciśnięcie klawisza Shift doda obiekt do istniejącego zaznaczenia. Jeśli klawisz ten nie jest naciśnięty, czyścimy
            // bieżące zaznaczenie
            if (!shiftPressed) {
                game.clearSelection();
            }
            game.selectItem(clickedItem, shiftPressed);
        }
    },
    // Zwracamy pierwszy wykryty obiekt znajdujący się poniżej kursora myszy
    itemUnderMouse: function () {
        // Jeśli kursor myszy wskazuje zamglony obszar, nie wykrywamy żadnych elementów
        if (fog.isPointOverFog(mouse.gameX, mouse.gameY)) {
            return;
        }
        for (let i = game.items.length - 1; i >= 0; i--) {
            let item = game.items[i];
            // Elementy oznaczone flagą dead zostaną pominięte
            if (item.lifeCode === "dead") {
                continue;
            }
            let x = item.x * game.gridSize;
            let y = item.y * game.gridSize;
            if (item.type === "buildings" || item.type === "terrain") {
                // Jeśli współrzędne kursora myszy znajdują się w prostokątnych granicach budynku lub terenu
                if (x <= mouse.gameX && x >= (mouse.gameX - item.baseWidth) && y <= mouse.gameY && y >= (mouse.gameY - item.baseHeight)) {
                    return item;
                }
            } else if (item.type === "aircraft") {
                // Jeśli współrzędne kursora myszy znajdują się w promieniu statku powietrznego
                // (po uwzględnienia wartości pixelShadowHeight)
                if (Math.pow(x - mouse.gameX, 2) + Math.pow(y - mouse.gameY - item.pixelShadowHeight, 2) < Math.pow(item.radius, 2)) {
                    return item;
                }
            } else if (item.type === "vehicles") {
                // Jeśli współrzędne kursora myszy znajdują się w promieniu elementu
                if (Math.pow(x - mouse.gameX, 2) + Math.pow(y - mouse.gameY, 2) < Math.pow(item.radius, 2)) {
                    return item;
                }
            }
        }
    },
    // Czy jest naciśnięty lewy przycisk myszy
    buttonPressed: false,
    mousedownhandler: function (ev) {
        mouse.insideCanvas = true;
        mouse.setCoordinates(ev.clientX, ev.clientY);
        if (ev.button === 0) { // Lewy przycisk myszy został naciśnięty
            mouse.buttonPressed = true;
            mouse.dragX = mouse.gameX;
            mouse.dragY = mouse.gameY;
        }
    },
    mouseuphandler: function (ev) {
        mouse.setCoordinates(ev.clientX, ev.clientY);
        let shiftPressed = ev.shiftKey;
        if (ev.button === 0) { // Lewy przycisk myszy został zwolniony
            if (mouse.dragSelect) {
                // Jeśli obecnie przeciągamy w celu zaznaczenia, próbujemy zaznaczyć elementy
                // znajdujące się wewnątrz ramki zaznaczenia
                mouse.finishDragSelection(shiftPressed);
            } else {
                // Jeśli nie przeciągamy, traktujemy to jako normalne kliknięcie po zwolnieniu myszy
                mouse.leftClick(shiftPressed);
            }
            mouse.buttonPressed = false;
        }
    },
    finishDragSelection: function (shiftPressed) {
        if (!shiftPressed) {
            // Jeśli nie jest naciśnięty klawisz Shift, usuwamy zaznaczenie elementów
            game.clearSelection();
        }
        // Obliczamy współrzędne obwiedni prostokąta zaznaczenia
        let x1 = Math.min(mouse.gameX, mouse.dragX);
        let y1 = Math.min(mouse.gameY, mouse.dragY);
        let x2 = Math.max(mouse.gameX, mouse.dragX);
        let y2 = Math.max(mouse.gameY, mouse.dragY);
        game.items.forEach(function (item) {
            // Elementy, których nie można zaznaczyć, elementy oznaczone flagą dead, elementy
            // należące do przeciwnika oraz budynki nie podlegają zaznaczeniu za pomocą przeciągnięcia
            if (!item.selectable || item.lifeCode === "dead" || item.team !== game.team || item.type === "buildings") {
                return;
            }
            let x = item.x * game.gridSize;
            let y = item.y * game.gridSize;
            if (x1 <= x && x2 >= x) {
                if ((item.type === "vehicles" && y1 <= y && y2 >= y)
                    // W przypadku statku powietrznego uwzględniamy wartość pixelShadowHeight
                    ||
                    (item.type === "aircraft" && (y1 <= y - item.pixelShadowHeight) &&
                        (y2 >= y - item.pixelShadowHeight))) {
                    game.selectItem(item, shiftPressed);
                }
            }
        });
        mouse.dragSelect = false;
    },
    buildableColor: "rgba(0,0,255,0.3)",
    unbuildableColor: "rgba(255,0,0,0.3)",
    draw: function () {
        // Jeśli gracz przeciąga zaznaczenie, rysujemy biały prostokąt oznaczający zaznaczany obszar
        if (this.dragSelect) {
            let x = Math.min(this.gameX, this.dragX);
            let y = Math.min(this.gameY, this.dragY);
            let width = Math.abs(this.gameX - this.dragX);
            let height = Math.abs(this.gameY - this.dragY);
            game.foregroundContext.strokeStyle = "white";
            game.foregroundContext.strokeRect(x - game.offsetX, y - game.offsetY, width, height);
        }

        if (mouse.insideCanvas && sidebar.deployBuilding && sidebar.placementGrid) {
            let x = (this.gridX * game.gridSize) - game.offsetX;
            let y = (this.gridY * game.gridSize) - game.offsetY;
            for (let i = sidebar.placementGrid.length - 1; i >= 0; i--) {
                for (let j = sidebar.placementGrid[i].length - 1; j >= 0; j--) {
                    let tile = sidebar.placementGrid[i][j];
                    if (tile) {
                        game.foregroundContext.fillStyle = (tile === 1) ? this.buildableColor : this.unbuildableColor;
                        game.foregroundContext.fillRect(x + j * game.gridSize, y + i *
                            game.gridSize, game.gridSize, game.gridSize);
                    }
                }
            }
        }
    },
    mouserightclickhandler: function (ev) {
        mouse.rightClick(ev, true);
        // Zapobiegamy wyświetleniu menu kontekstowego przeglądarki
        ev.preventDefault(true);
    },
    // Funkcja wywoływana, gdy gracz kliknie prawym przyciskiem myszy obiekt canvas gry
    rightClick: function () {
        // Jeśli gra znajduje się w trybie deployBuilding, kliknięcie prawym przyciskiem myszy anuluje tryb deployBuilding
        if (sidebar.deployBuilding) {
            sidebar.cancelDeployingBuilding();
            return;
        }
        let clickedItem = mouse.itemUnderMouse();
        // Obsługa atakowania i ruchu zaznaczonych jednostek
        if (clickedItem) { // Gracz kliknął coś prawym przyciskiem myszy
            if (clickedItem.type !== "terrain") {
                if (clickedItem.team !== game.team) { // Gracz kliknął prawym przyciskiem myszy element przeciwnika
                    let uids = [];
                    // Identyfikujemy zaznaczone jednostki z zespołu gracza, które są zdolne do ataku
                    game.selectedItems.forEach(function (item) {
                        if (item.team === game.team && item.canAttack) {
                            uids.push(item.uid);
                        }
                    }, this);
                    // Nakazujemy jednostkom atak na kliknięty element
                    if (uids.length > 0) {
                        game.sendCommand(uids, {
                            type: "attack",
                            toUid: clickedItem.uid
                        });
                        sounds.play("acknowledge-attacking");
                    }
                } else { // Gracz kliknął swój element prawym przyciskiem myszy
                    let uids = [];
                    // Identyfikujemy zaznaczone jednostki z zespołu gracza, które mogą się poruszać
                    game.selectedItems.forEach(function (item) {
                        if (item.team === game.team && item.canAttack && item.canMove) {
                            uids.push(item.uid);
                        }
                    }, this);
                    // Nakazujemy jednostkom ochronę klikniętego elementu
                    if (uids.length > 0) {
                        game.sendCommand(uids, {
                            type: "guard",
                            toUid: clickedItem.uid
                        });
                        sounds.play("acknowledge-moving");
                    }
                }
            } else if (clickedItem.name === "oilfield") { // Gracz kliknął pole naftowe prawym przyciskiem myszy
                let uids = [];
                // Identyfikujemy pierwszy zaznaczony pojazd typu harvester (ponieważ w danym czasie
                // można rozmieścić tylko jeden z nich)
                for (let i = game.selectedItems.length - 1; i >= 0; i--) {
                    let item = game.selectedItems[i];
                    if (item.team === game.team && item.type === "vehicles" && item.name === "harvester") {
                        uids.push(item.uid);
                        break;
                    }
                }
                // Nakazujemy mu rozpoczęcie wydobycia na polu naftowym
                if (uids.length > 0) {
                    game.sendCommand(uids, {
                        type: "deploy",
                        toUid: clickedItem.uid
                    });
                    sounds.play("acknowledge-moving");
                }
            }
        } else { // Gracz kliknął podłoże prawym przyciskiem myszy
            let uids = [];
            // Identyfikujemy zaznaczone jednostki z zespołu gracza, które mogą się poruszać
            game.selectedItems.forEach(function (item) {
                if (item.team === game.team && item.canMove) {
                    uids.push(item.uid);
                }
            }, this);
            // Nakazujemy jednostkom przesunięcie się do klikniętego miejsca
            if (uids.length > 0) {
                game.sendCommand(uids, {
                    type: "move",
                    to: {
                        x: mouse.gameX / game.gridSize,
                        y: mouse.gameY / game.gridSize
                    }
                });
                sounds.play("acknowledge-moving");
            }
        }
    },
    touchstarthandler: function (ev) {
        mouse.insideCanvas = true;
        let touch = event.targetTouches[0];
        mouse.setCoordinates(touch.clientX, touch.clientY);
        mouse.buttonPressed = true;
        mouse.dragX = mouse.gameX;
        mouse.dragY = mouse.gameY;
        ev.preventDefault();
    },
    touchmovehandler: function (ev) {
        mouse.insideCanvas = true;
        let touch = ev.targetTouches[0];
        mouse.setCoordinates(touch.clientX, touch.clientY);
        mouse.checkIfDragging();
        ev.preventDefault();
    },
    doubleTapTimeoutThreshold: 300,
    doubleTapTimeout: undefined,
    touchendhandler: function (ev) {
        // Chociaż zwykle urządzenia dotykowe nie mają klawiatury, na wszelki wypadek zostawmy ten fragment kodu
        let shiftPressed = ev.shiftKey;
        if (mouse.dragSelect) {
            // Jeśli obecnie przeciągamy w celu zaznaczenia, próbujemy zaznaczyć elementy
            // znajdujące się wewnątrz ramki zaznaczenia
            mouse.finishDragSelection(shiftPressed);
        } else {
            // Jeśli nie jesteśmy w trakcie przeciągania, czekamy na osiągnięcie progu, zanim potraktujemy
            // dotknięcie jako kliknięcie lewym przyciskiem myszy
            if (!mouse.doubleTapTimeout) {
                mouse.doubleTapTimeout = setTimeout(function () {
                    mouse.doubleTapTimeout = undefined;
                    mouse.leftClick();
                }, mouse.doubleTapTimeoutThreshold);
            } else {
                // Jeśli w ciągu określonego czasu nastąpi drugie stuknięcie, traktujemy je jako podwójne stuknięcie
                // (nasze przybliżenie kliknięcia prawym przyciskiem)
                clearTimeout(mouse.doubleTapTimeout);
                mouse.doubleTapTimeout = undefined;
                mouse.rightClick();
            }
        }
        mouse.buttonPressed = false;
        // Gdy zdarzenie dotyku się skończy, działamy, jakby kursor myszy znalazł się poza obiektem canvas
        mouse.insideCanvas = false;
        ev.preventDefault();
    },
};