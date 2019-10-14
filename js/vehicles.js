var vehicles = {
    list: {
        "transport": {
            name: "transport",
            pixelWidth: 31,
            pixelHeight: 30,
            pixelOffsetX: 15,
            pixelOffsetY: 15,
            radius: 15,
            speed: 15,
            sight: 3,
            cost: 400,
            hitPoints: 100,
            turnSpeed: 3,
            spriteImages: [{
                name: "stand",
                count: 1,
                directions: 8
            }],
        },
        "harvester": {
            name: "harvester",
            pixelWidth: 21,
            pixelHeight: 20,
            pixelOffsetX: 10,
            pixelOffsetY: 10,
            radius: 10,
            speed: 10,
            sight: 3,
            cost: 1600,
            canConstruct: true,
            hitPoints: 50,
            turnSpeed: 3,
            spriteImages: [{
                name: "stand",
                count: 1,
                directions: 8
            }],
        },
        "scout-tank": {
            name: "scout-tank",
            canAttack: true,
            canAttackLand: true,
            canAttackAir: true,
            weaponType: "bullet",
            pixelWidth: 21,
            pixelHeight: 21,
            pixelOffsetX: 10,
            pixelOffsetY: 10,
            radius: 11,
            speed: 20,
            sight: 4,
            cost: 500,
            canConstruct: true,
            hitPoints: 50,
            turnSpeed: 5,
            spriteImages: [{
                name: "stand",
                count: 1,
                directions: 8
            }],
        },
        "heavy-tank": {
            name: "heavy-tank",
            canAttack: true,
            canAttackLand: true,
            canAttackAir: false,
            weaponType: "cannon-ball",
            pixelWidth: 30,
            pixelHeight: 30,
            pixelOffsetX: 15,
            pixelOffsetY: 15,
            radius: 13,
            speed: 15,
            sight: 5,
            cost: 1200,
            canConstruct: true,
            hitPoints: 50,
            turnSpeed: 4,
            spriteImages: [{
                name: "stand",
                count: 1,
                directions: 8
            }],
        }
    },
    defaults: {
        type: "vehicles",
        directions: 8,
        canMove: true,
        processActions: function () {
            let direction = Math.round(this.direction) % this.directions;
            switch (this.action) {
                case "stand":
                    this.imageList = this.spriteArray["stand-" + direction];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                    }
                    break;
                case "teleport":
                    this.imageList = this.spriteArray["stand-" + direction];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                    }
                    // Inicjalizujemy zmienną brightness podczas pierwszej teleportacji jednostki
                    if (this.brightness === undefined) {
                        this.brightness = 0.6;
                    }
                    this.brightness -= 0.05;
                    // Gdy wartość zmiennej brightness osiągnie zero, resetujemy ją i przechodzimy do stanu stand
                    if (this.brightness <= 0) {
                        this.brightness = undefined;
                        this.action = "stand";
                    }
                    break;
            }
        },
        // Domyślna funkcja służąca do rysowania pojazdu
        drawSprite: function () {
            let x = this.drawingX;
            let y = this.drawingY;
            let colorIndex = 1;
            switch (this.team) {
                case "red":
                    colorIndex = 0;
                    break;
                case "blue":
                    colorIndex = 1;
                    break;
                case "green":
                    colorIndex = 2;
                    break;
            }            
            let colorOffset = colorIndex * this.pixelHeight;
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
        },
        drawLifeBar: function () {
            let x = this.drawingX;
            let y = this.drawingY - 2 * this.lifeBarHeight;
            game.foregroundContext.fillStyle = (this.lifeCode === "healthy") ? this.lifeBarHealthyFillColor : this.lifeBarDamagedFillColor;
            game.foregroundContext.fillRect(x, y, this.pixelWidth * this.life / this.hitPoints, this.lifeBarHeight);
            game.foregroundContext.strokeStyle = this.lifeBarBorderColor;
            game.foregroundContext.lineWidth = 1;
            game.foregroundContext.strokeRect(x, y, this.pixelWidth, this.lifeBarHeight);
        },
        drawSelection: function () {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY;
            game.foregroundContext.strokeStyle = this.selectionBorderColor;
            game.foregroundContext.lineWidth = 1;
            // Rysujemy wypełnione koło wokół pojazdu
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
            game.foregroundContext.fillStyle = this.selectionFillColor;
            game.foregroundContext.fill();
            game.foregroundContext.stroke();
        },
        processOrders: function () {
            this.lastMovementX = 0;
            this.lastMovementY = 0;
            if (this.orders.to) {
                var distanceFromDestination = Math.pow(Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2), 0.5);
                var radius = this.radius / game.gridSize;
            }
            if (this.reloadTimeLeft) {
                this.reloadTimeLeft--;
            }
            var targets;

            switch (this.orders.type) {
                case "move":
                    // Poruszamy się w kierunku docelowym, aż odległość będzie mniejsza niż promień pojazdu
                    if (distanceFromDestination < radius) {
                        // Zatrzymujemy się, gdy pojazd znajduje się w odległości od miejsca docelowego
                        // równej promieniowi pojazdu
                        this.orders = {
                            type: "stand"
                        };
                    } else if (this.colliding && distanceFromDestination < 3 * radius) {
                        // W przypadku ryzyka kolizji zatrzymujemy się w odległości 3 promieni od miejsca docelowego
                        this.orders = {
                            type: "stand"
                        };
                        break;
                    } else {
                        if (this.colliding && distanceFromDestination < 5 * radius) {
                            // Obliczamy kolizje na obszarze znajdujących się w odległości 5 promieni
                            // pojazdu od miejsca docelowego
                            if (!this.orders.collisionCount) {
                                this.orders.collisionCount = 1;
                            } else {
                                this.orders.collisionCount++;
                            }
                            // Zatrzymujemy się, jeśli istnieje ryzyko ponad 30 kolizji
                            if (this.orders.collisionCount > 30) {
                                this.orders = {
                                    type: "stand"
                                };
                                break;
                            }
                        }
                        let moving = this.moveTo(this.orders.to, distanceFromDestination);
                        // Nie udało się znaleźć ścieżki, dlatego zatrzymujemy się
                        if (!moving) {
                            this.orders = {
                                type: "stand"
                            };
                            break;
                        }
                    }
                    break;
                case "deploy":
                    // Jeśli pole naftowe zostało już wykorzystane, anulujemy polecenie
                    if (this.orders.to.lifeCode === "dead") {
                        this.orders = {
                            type: "stand"
                        };
                        return;
                    }
                    if (distanceFromDestination < radius + 1) {
                        // Gdy pojazd znajdzie się w odległości 1 kwadratu od pola naftowego, obracamy go w lewo (kierunek 6)
                        this.turnTo(6);
                        if (!this.turning) {
                            // Jeśli pole naftowe zostało już wykorzystane, anulujemy polecenie
                            if (this.orders.to.lifeCode === "dead") {
                                this.orders = {
                                    type: "stand"
                                };
                                return;
                            }
                            // Gdy pojazd jest skierowany w lewo, usuwamy pojazd oraz pole naftowe i instalujemy budynek typu harvester
                            game.remove(this.orders.to);
                            this.orders.to.lifeCode = "dead";
                            game.remove(this);
                            this.lifeCode = "dead";
                            game.add({
                                type: "buildings",
                                name: "harvester",
                                x: this.orders.to.x,
                                y: this.orders.to.y,
                                action: "deploy",
                                team: this.team
                            });
                        }
                    } else {
                        let moving = this.moveTo(this.orders.to, distanceFromDestination);
                        // Nie udało się znaleźć ścieżki, dlatego zatrzymujemy się
                        if (!moving) {
                            this.orders = {
                                type: "stand"
                            };
                        }
                    }
                    break;
                case "stand":
                    // Szukamy celów znajdujących się w polu rażenia
                    targets = this.findTargetsInSight();
                    if (targets.length > 0) {
                        this.orders = {
                            type: "attack",
                            to: targets[0]
                        };
                    }
                    break;
                case "sentry":
                    // Szukamy celów znajdujących się w odległości większej maksymalnie o 2 kwadraty od pola rażenia
                    targets = this.findTargetsInSight(2);
                    if (targets.length > 0) {
                        this.orders = {
                            type: "attack",
                            to: targets[0],
                            previousOrder: this.orders
                        };
                    }
                    break;
                case "hunt":
                    // Szukamy celów na całej mapie
                    targets = this.findTargetsInSight(100);
                    if (targets.length > 0) {
                        this.orders = {
                            type: "attack",
                            to: targets[0],
                            previousOrder: this.orders
                        };
                    }
                    break;
                case "attack":
                    // Jeśli cel nie jest już poprawny, anulujemy bieżące polecenie
                    if (!this.isValidTarget(this.orders.to)) {
                        this.cancelCurrentOrder();
                        break;
                    }
                    // Sprawdzamy, czy pojazd znajduje się w polu rażenia celu
                    if (this.isTargetInSight(this.orders.to)) {
                        // Obracamy się w kierunku celu i rozpoczynamy atak, gdy cel znajdzie się w polu rażenia
                        var targetDirection = this.findAngleForFiring(this.orders.to);
                        // W razie potrzeby obracamy się w kierunku docelowym
                        this.turnTo(targetDirection);
                        // Sprawdzamy, czy pojazd zakończył obrót
                        if (!this.turning) {
                            // Jeśli przeładowanie się zakończyło, strzelamy pociskiem
                            if (!this.reloadTimeLeft) {
                                this.reloadTimeLeft = bullets.list[this.weaponType].reloadTime;
                                var angleRadians = -(targetDirection / this.directions) * 2 * Math.PI;
                                var bulletX = this.x - (this.radius * Math.sin(angleRadians) / game.gridSize);
                                var bulletY = this.y - (this.radius * Math.cos(angleRadians) / game.gridSize);
                                game.add({
                                    name: this.weaponType,
                                    type: "bullets",
                                    x: bulletX,
                                    y: bulletY,
                                    direction: targetDirection,
                                    target: this.orders.to
                                });
                            }
                        }
                    } else {
                        // Przenosimy się w kierunku celu
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }
                    break;
                case "patrol":
                    targets = this.findTargetsInSight(1);
                    if (targets.length > 0) {
                        // Atakujemy cel, ale zapisujemy polecenie patrol w zmiennej previousOrder
                        this.orders = {
                            type: "attack",
                            to: targets[0],
                            previousOrder: this.orders
                        };
                        break;
                    }
                    // Przenosimy się w kierunku celu, aż znajdzie się w polu rażenia
                    if (distanceFromDestination < this.sight) {
                        // Zamieniamy pozycje to i from
                        var to = this.orders.to;
                        this.orders.to = this.orders.from;
                        this.orders.from = to;
                    } else {
                        // Przenosimy się do następnego celu
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }
                    break;
                case "guard":
                    // Jeśli ochraniany element jest nieżywy, anulujemy bieżące polecenie
                    if (this.orders.to.lifeCode === "dead") {
                        this.cancelCurrentOrder();
                        break;
                    }
                    // Jeśli cel znajduje się w polu rażenia
                    if (distanceFromDestination < this.sight) {
                        // Szukamy wrogów w pobliżu
                        targets = this.findTargetsInSight(1);
                        if (targets.length > 0) {
                            // Atakujemy najbliższy cel, ale zapisujemy polecenie guard w zmiennej previousOrder
                            this.orders = {
                                type: "attack",
                                to: targets[0],
                                previousOrder: this.orders
                            };
                            break;
                        }
                    } else {
                        // Przenosimy się w kierunku celu
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }
                    break;

            }
        },
        // Jak wolno jednostka porusza się podczas obracania się
        speedAdjustmentWhileTurningFactor: 0.5,
        moveTo: function (destination, distanceFromDestination) {
            let start = [Math.floor(this.x), Math.floor(this.y)];
            let end = [Math.floor(destination.x), Math.floor(destination.y)];
            // Kierunek, w jakim musimy się obrócić, aby osiągnąć miejsce docelowe
            let newDirection;
            let vehicleOutsideMapBounds = (start[1] < 0 || start[1] > game.currentMap.mapGridHeight - 1 || start[0] < 0 || start[0] > game.currentMap.mapGridWidth);
            let vehicleReachedDestinationTile = (start[0] === end[0] && start[1] === end[1]);
            // W razie potrzeby przebudowujemy siatkę dostępnych kafelków
            if (!game.currentMapPassableGrid) {
                game.rebuildPassableGrid();
            }
            if (vehicleOutsideMapBounds || vehicleReachedDestinationTile) {
                // Nie korzystamy z algorytmu A*. Obracamy się tylko ku miejscu docelowemu
                newDirection = this.findAngle(destination);
                this.orders.path = [
                    [this.x, this.y],
                    [destination.x, destination.y]
                ];
            } else {
                // Korzystamy z algorytmu A*, aby spróbować znaleźć ścieżkę do miejsca docelowego
                let grid;
                if (destination.type === "buildings" || destination.type === "terrain") {
                    // W przypadku budynków lub terenu nieco modyfikujemy siatkę, aby algorytm mógł znaleźć ścieżkę
                    // Najpierw kopiujemy siatkę dostępnych miejsc
                    grid = game.makeArrayCopy(game.currentMapPassableGrid);
                    // Następnie modyfikujemy miejsce docelowe, aby było "dostępne"
                    grid[Math.floor(destination.y)][Math.floor(destination.x)] = 0;
                } else {
                    // We wszystkich pozostałych przypadkach używamy siatki dostępnych miejsc
                    grid = game.currentMapPassableGrid;
                }
                this.orders.path = AStar(grid, start, end, "Euclidean");
                if (this.orders.path.length > 1) {
                    // Następnym krokiem jest środek kolejnego elementu ścieżki
                    let nextStep = {
                        x: this.orders.path[1][0] + 0.5,
                        y: this.orders.path[1][1] + 0.5
                    };
                    newDirection = this.findAngle(nextStep);
                } else {
                    // Informujemy wywołującą funkcję, że nie istnieje żadna ścieżka
                    return false;
                }
            }

            // Obsługa kolizji i nawigacja
            let collisionObjects = this.checkForCollisions(game.currentMapPassableGrid);
            // Przesunięcie wzdłuż obecnej ścieżki doprowadzi do kolizji
            if (this.colliding) {
                newDirection = this.steerAwayFromCollisions(collisionObjects);
            }
            // W razie potrzeby zmieniamy kierunek
            this.turnTo(newDirection);
            // Obliczamy maksymalną odległość, na jaką może się przesunąć pojazd w cyklu animacji
            let maximumMovement = this.speed * this.speedAdjustmentFactor * (this.turning ?
                this.speedAdjustmentWhileTurningFactor : 1);
            let movement = Math.min(maximumMovement, distanceFromDestination);
            if (this.hardCollision) {
                movement = 0;
            }
            // Obliczamy komponenty x i y ruchu
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;
            this.lastMovementX = -(movement * Math.sin(angleRadians));
            this.lastMovementY = -(movement * Math.cos(angleRadians));
            this.x = this.x + this.lastMovementX;
            this.y = this.y + this.lastMovementY;
            // Informujemy wywołującą funkcję, że można było wykonać ruch
            return true;
        },
        // Tworzymy listę kolizji, jaka czeka pojazd na bieżącej ścieżce
        checkForCollisions: function (grid) {
            // Obliczamy nowe położenie na bieżącej ścieżce w przypadku maksymalnej szybkości
            let movement = this.speed * this.speedAdjustmentFactor;
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;
            let newX = this.x - (movement * Math.sin(angleRadians));
            let newY = this.y - (movement * Math.cos(angleRadians));
            this.colliding = false;
            this.hardCollision = false;
            // Tworzymy listę obiektów, z którymi pojazd się zderzy po następnym kroku
            let collisionObjects = [];
            // Sprawdzamy istnienie kolizji na siatce obejmującej obszar do 3 prostokątów od położenia pojazdu
            let x1 = Math.max(0, Math.floor(newX) - 3);
            let x2 = Math.min(game.currentMap.mapGridWidth - 1, Math.floor(newX) + 3);
            let y1 = Math.max(0, Math.floor(newY) - 3);
            let y2 = Math.min(game.currentMap.mapGridHeight - 1, Math.floor(newY) + 3);
            let gridHardCollisionThreshold = Math.pow(this.radius * 0.9 / game.gridSize, 2);
            let gridSoftCollisionThreshold = Math.pow(this.radius * 1.1 / game.gridSize, 2);
            for (let j = x1; j <= x2; j++) {
                for (let i = y1; i <= y2; i++) {
                    if (grid[i][j] === 1) { // Kwadrat siatki jest zablokowany
                        let distanceSquared = Math.pow(j + 0.5 - newX, 2) + Math.pow(i + 0.5 - newY, 2);
                        if (distanceSquared < gridHardCollisionThreshold) {
                            // Odległość zablokowanego elementu siatki od pojazdu jest mniejsza niż próg twardej kolizji
                            collisionObjects.push({
                                collisionType: "hard",
                                with: {
                                    type: "wall",
                                    x: j + 0.5,
                                    y: i + 0.5
                                }
                            });
                            this.colliding = true;
                            this.hardCollision = true;
                        } else if (distanceSquared < gridSoftCollisionThreshold) {
                            // Odległość zablokowanego elementu siatki od pojazdu jest mniejsza niż próg miękkiej kolizji
                            collisionObjects.push({
                                collisionType: "soft",
                                with: {
                                    type: "wall",
                                    x: j + 0.5,
                                    y: i + 0.5
                                }
                            });
                            this.colliding = true;
                        }
                    }
                }
            }
            for (let i = game.vehicles.length - 1; i >= 0; i--) {
                let vehicle = game.vehicles[i];
                // Sprawdzamy pojazdy znajdujące się w odległości mniejszej niż 3 kwadraty od kolizji
                if (vehicle !== this && Math.abs(vehicle.x - this.x) < 3 && Math.abs(vehicle.y - this.y) < 3) {
                    if (Math.pow(vehicle.x - newX, 2) + Math.pow(vehicle.y - newY, 2) < Math.pow((this.radius + vehicle.radius) / game.gridSize, 2)) {
                        // Odległość między pojazdami jest mniejsza niż próg twardej kolizji
                        collisionObjects.push({
                            collisionType: "hard",
                            with: vehicle
                        });
                        this.colliding = true;
                        this.hardCollision = true;
                    } else if (Math.pow(vehicle.x - newX, 2) + Math.pow(vehicle.y - newY, 2) <
                        Math.pow((this.radius * 1.5 + vehicle.radius) / game.gridSize, 2)) {
                        // Odległość między pojazdami jest mniejsza niż próg miękkiej kolizji
                        // (1.5 * promień pojazdu + promień zderzającego się pojazdu)
                        collisionObjects.push({
                            collisionType: "soft",
                            with: vehicle
                        });
                        this.colliding = true;
                    }
                }
            }
            return collisionObjects;
        },
        steerAwayFromCollisions: function (collisionObjects) {
            // Tworzymy obiekt wektora siły uwzględniającego odpychanie od wszystkich kolidujących obiektów
            let forceVector = {
                x: 0,
                y: 0
            };
            // Domyślnie następny krok ma lekką siłę przyciągania
            collisionObjects.push({
                collisionType: "attraction",
                with: {
                    x: this.orders.path[1][0] + 0.5,
                    y: this.orders.path[1][1] + 0.5
                }
            });
            for (let i = collisionObjects.length - 1; i >= 0; i--) {
                let collObject = collisionObjects[i];
                let objectAngle = this.findAngle(collObject.with);
                let objectAngleRadians = -(objectAngle / this.directions) * 2 * Math.PI;
                let forceMagnitude;
                switch (collObject.collisionType) {
                    case "hard":
                        forceMagnitude = 2;
                        break;
                    case "soft":
                        forceMagnitude = 1;
                        break;
                    case "attraction":
                        forceMagnitude = -0.25;
                        break;
                }
                forceVector.x += (forceMagnitude * Math.sin(objectAngleRadians));
                forceVector.y += (forceMagnitude * Math.cos(objectAngleRadians));
            }
            // Znajdujemy nowy kierunek na podstawie wektora siły
            let newDirection = this.directions / 2 - (Math.atan2(forceVector.x, forceVector.y) * this.directions / (2 * Math.PI));
            newDirection = (newDirection + this.directions) % this.directions;
            return newDirection;
        },
    },
    load: loadItem,
    add: addItem,
};