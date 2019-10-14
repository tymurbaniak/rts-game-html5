var buildings = {
    list: {
        "base": {
            name: "base",
            // Właściwości niezbędne podczas rysowania obiektu
            // Wymiary poszczególnych sprite’ów
            pixelWidth: 60,
            pixelHeight: 60,
            // Wymiary powierzchni bazy
            baseWidth: 40,
            baseHeight: 40,
            // Przesunięcie obszaru bazy względem górnego lewego rogu sprite’a
            pixelOffsetX: 0,
            pixelOffsetY: 20,
            // Kwadraty siatki potrzebne podczas konstrukcji budynku
            buildableGrid: [
                [1, 1],
                [1, 1]
            ],
            // Kwadraty siatki, które można przejść lub które są zablokowane
            passableGrid: [
                [1, 1],
                [1, 1]
            ],
            // Jak daleko budynek może "widzieć" poprzez mgłę wojenną
            sight: 3,
            // Maksymalne wartości wyznaczające żywotność
            hitPoints: 500,
            cost: 5000,
            spriteImages: [{
                    name: "healthy",
                    count: 4
                },
                {
                    name: "damaged",
                    count: 1
                },
                {
                    name: "constructing",
                    count: 3
                }
            ],
            processOrders: function () {
                switch (this.orders.type) {
                    case "construct-building":
                        this.action = "construct";
                        this.animationIndex = 0;
                        // Teleportujemy budynek i odejmujemy jego koszt od kwoty posiadanej przez gracza
                        var itemDetails = this.orders.details;
                        itemDetails.team = this.team;
                        itemDetails.action = "teleport";
                        var item = game.add(itemDetails);
                        game.cash[this.team] -= item.cost;
                        this.orders = {
                            type: "stand"
                        };
                        break;
                }
            }
        },
        "starport": {
            name: "starport",
            pixelWidth: 40,
            pixelHeight: 60,
            baseWidth: 40,
            baseHeight: 55,
            pixelOffsetX: 1,
            pixelOffsetY: 5,
            buildableGrid: [
                [1, 1],
                [1, 1],
                [1, 1]
            ],
            passableGrid: [
                [1, 1],
                [0, 0],
                [0, 0]
            ],
            sight: 3,
            cost: 2000,
            canConstruct: true,
            hitPoints: 300,
            spriteImages: [{
                    name: "teleport",
                    count: 9
                },
                {
                    name: "closing",
                    count: 18
                },
                {
                    name: "healthy",
                    count: 4
                },
                {
                    name: "damaged",
                    count: 1
                }
            ],
            isUnitOnTop: function () {
                let unitOnTop = false;
                for (let i = game.items.length - 1; i >= 0; i--) {
                    let item = game.items[i];
                    if (item.type === "vehicles" || item.type === "aircraft") {
                        if (item.x > this.x && item.x < this.x + 2 && item.y > this.y && item.y <
                            this.y + 3) {
                            unitOnTop = true;
                            break;
                        }
                    }
                }
                return unitOnTop;
            },
            processOrders: function () {
                switch (this.orders.type) {
                    case "construct-unit":
                        if (this.lifeCode !== "healthy") {
                            // Jeśli budynek nie jest w dobrym stanie, ignorujemy polecenie
                            this.orders = {
                                type: "stand"
                            };
                            break;
                        }
                        var unitOnTop = this.isUnitOnTop();
                        var cost = window[this.orders.details.type].list[this.orders.details.name].cost;
                        var cash = game.cash[this.team];
                        if (unitOnTop) {
                            // Sprawdzamy, czy na budynku znajduje się jednostka
                            if (this.team === game.team) {
                                game.showMessage("system", "Ostrzeżenie! Nie można teleportować jednostki,gdy miejsce dokowania jest zajęte.");
                            }
                        } else if (cash < cost) {
                            // Sprawdzamy, czy gracz ma wystarczającą ilość gotówki
                            if (this.team === game.team) {
                                game.showMessage("system", "Ostrzeżenie! Niewystarczające fundusze.Potrzebujemy " + cost + " jednostek gotówki.");
                            }
                        } else {
                            this.action = "open";
                            this.animationIndex = 0;
                            let itemDetails = Object.assign({}, this.orders.details);
                            // Umieszczamy nową jednostkę nad środkiem obiektu typu starport
                            itemDetails.x = this.x + 0.5 * this.pixelWidth / game.gridSize;
                            itemDetails.y = this.y + 0.5 * this.pixelHeight / game.gridSize;
                            // Odejmujemy koszt od zasobów gotówki gracza
                            game.cash[this.team] -= cost;
                            // Nakazujemy teleportację jednostce, gdy tylko zostanie skonstruowana
                            itemDetails.action = "teleport";
                            itemDetails.team = this.team;
                            this.constructUnit = itemDetails;
                        }
                        this.orders = {
                            type: "stand"
                        };
                        break;
                }
            }
        },
        "harvester": {
            name: "harvester",
            pixelWidth: 40,
            pixelHeight: 60,
            baseWidth: 40,
            baseHeight: 20,
            pixelOffsetX: -2,
            pixelOffsetY: 40,
            buildableGrid: [
                [1, 1]
            ],
            passableGrid: [
                [1, 1]
            ],
            sight: 3,
            cost: 5000,
            hitPoints: 300,
            spriteImages: [{
                    name: "deploy",
                    count: 17
                },
                {
                    name: "healthy",
                    count: 3
                },
                {
                    name: "damaged",
                    count: 1
                }
            ],
        },
        "ground-turret": {
            name: "ground-turret",
            canAttack: true,
            canAttackLand: true,
            canAttackAir: false,
            weaponType: "cannon-ball",
            action: "stand",
            direction: 0, // Domyślnie kierujemy działko ku górze (0)
            directions: 8, // Możemy mieć 8 kierunków działka (0-7)
            orders: {
                type: "guard"
            },
            pixelWidth: 38,
            pixelHeight: 32,
            baseWidth: 20,
            baseHeight: 18,
            cost: 1500,
            canConstruct: true,
            pixelOffsetX: 9,
            pixelOffsetY: 12,
            buildableGrid: [
                [1]
            ],
            passableGrid: [
                [1]
            ],
            sight: 5,
            hitPoints: 200,
            spriteImages: [{
                    name: "teleport",
                    count: 9
                },
                {
                    name: "healthy",
                    count: 1,
                    directions: 8
                },
                {
                    name: "damaged",
                    count: 1
                }
            ],
            turnSpeed: 1,
            processOrders: function () {
                if (this.reloadTimeLeft) {
                    this.reloadTimeLeft--;
                }
                // Zniszczone działko nie może nic zrobić
                if (this.lifeCode !== "healthy") {
                    return;
                }
                var targets;
                switch (this.orders.type) {
                    case "guard":
                        targets = this.findTargetsInSight();
                        if (targets.length > 0) {
                            this.orders = {
                                type: "attack",
                                to: targets[0]
                            };
                        }
                        break;
                    case "attack":
                        // Jeśli bieżący cel nie jest odpowiedni, wracamy do trybu obrony
                        if (!this.isValidTarget(this.orders.to) || !this.isTargetInSight(this.orders.to)) {
                            this.orders = {
                                type: "guard"
                            };
                            break;
                        }
                        var targetDirection = this.findAngleForFiring(this.orders.to);
                        // W razie potrzeby obracamy działko w kierunku celu
                        this.turnTo(targetDirection);
                        // Sprawdzamy, czy działko skończyło obracanie
                        if (!this.turning) {
                            // Sprawdzamy, czy broń się przeładowała
                            if (!this.reloadTimeLeft) {
                                // Obliczamy początkową pozycję pocisku
                                let angleRadians = -(targetDirection / this.directions) * 2 * Math.PI;
                                let bulletX = this.x + 0.5 - (1 * Math.sin(angleRadians));
                                let bulletY = this.y + 0.5 - (1 * Math.cos(angleRadians));
                                // Wystrzeliwujemy pocisk
                                game.add({
                                    name: this.weaponType,
                                    type: "bullets",
                                    x: bulletX,
                                    y: bulletY,
                                    direction: targetDirection,
                                    target: this.orders.to
                                });
                                // Ustawiamy czas schładzania podczas przeładowania broni
                                this.reloadTimeLeft = bullets.list[this.weaponType].reloadTime;
                            }
                        }
                        break;
                }
            }
        },
    },
    defaults: {
        type: "buildings",
        processActions: function () {
            switch (this.action) {
                case "stand":
                    if (this.name === "ground-turret" && this.lifeCode === "healthy") {
                        // W przypadku działka o dobrej kondycji korzystamy ze zmiennej direction, aby wybrać listę obrazów
                        let direction = Math.round(this.direction) % this.directions;
                        this.imageList = this.spriteArray[this.lifeCode + "-" + direction];
                    } else {
                        // W pozostałych przypadkach korzystamy ze zmiennej lifeCode
                        this.imageList = this.spriteArray[this.lifeCode];
                    }
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                    }
                    break;
                case "construct":
                    this.imageList = this.spriteArray["constructing"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "stand";
                    }
                    break;
                case "teleport":
                    this.imageList = this.spriteArray["teleport"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    // Po zakończeniu teleportowania przechodzimy do trybu stand
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "stand";
                    }
                    break;
                case "close":
                    this.imageList = this.spriteArray["closing"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    // Po zakończeniu zamykania powracamy do trybu stand
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "stand";
                    }
                    break;
                case "open":
                    this.imageList = this.spriteArray["closing"];
                    // Otwieranie polega na odtworzeniu sprite’ów zamykania, tylko w odwrotnej kolejności
                    this.imageOffset = this.imageList.offset + this.imageList.count - this.animationIndex;
                    this.animationIndex++;
                    // Po zakończeniu otwierania przechodzimy do trybu close
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "close";

                        // Jeśli została ustawiona zmienna constructUnit, dodajemy do gry nową jednostkę
                        if (this.constructUnit) {
                            game.add(this.constructUnit);
                            this.constructUnit = undefined;
                        }
                    }
                    break;
                case "deploy":
                    this.imageList = this.spriteArray["deploy"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    // Po rozlokowaniu obiektu przechodzimy do eksploatacji
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "harvest";
                    }
                    break;
                case "harvest":
                    this.imageList = this.spriteArray[this.lifeCode];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        if (this.lifeCode === "healthy") {
                            // Kombajny zarabiają 2 jednostki gotówki w jednym cyklu animacji
                            game.cash[this.team] += 2;
                        }
                    }
                    break;
            }
        },
        // Domyślna funkcja służąca do rysowania budynku
        drawSprite: function () {
            let x = this.drawingX;
            let y = this.drawingY;
            // We wszystkich arkuszach sprite’ów obrazy dla zespołu niebieskiego znajdują się w pierwszym rzędzie,
            // a dla zielonego w drugim
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
            // Rysujemy sprite w punkcie x, y
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
        },
        drawLifeBar: function () {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY - 2 * this.lifeBarHeight;
            game.foregroundContext.fillStyle = (this.lifeCode === "healthy") ? this.lifeBarHealthyFillColor : this.lifeBarDamagedFillColor;
            game.foregroundContext.fillRect(x, y, this.baseWidth * this.life / this.hitPoints, this.lifeBarHeight);
            game.foregroundContext.strokeStyle = this.lifeBarBorderColor;
            game.foregroundContext.lineWidth = 1;
            game.foregroundContext.strokeRect(x, y, this.baseWidth, this.lifeBarHeight);
        },
        drawSelection: function () {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY;
            game.foregroundContext.strokeStyle = this.selectionBorderColor;
            game.foregroundContext.lineWidth = 1;
            game.foregroundContext.fillStyle = this.selectionFillColor;
            // Rysujemy wypełniony prostokąt wokół budynku
            game.foregroundContext.fillRect(x - 1, y - 1, this.baseWidth + 2, this.baseHeight + 2);
            game.foregroundContext.strokeRect(x - 1, y - 1, this.baseWidth + 2, this.baseHeight + 2);
        },
    },
    load: loadItem,
    add: addItem,
};