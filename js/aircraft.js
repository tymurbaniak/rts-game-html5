var aircraft = {
    list: {
        "chopper": {
            name: "chopper",
            cost: 900,
            canConstruct: true,
            pixelWidth: 40,
            pixelHeight: 40,
            pixelOffsetX: 20,
            pixelOffsetY: 20,
            weaponType: "heatseeker",
            radius: 18,
            sight: 6,
            canAttack: true,
            canAttackLand: true,
            canAttackAir: true,
            hitPoints: 50,
            speed: 25,
            turnSpeed: 4,
            pixelShadowHeight: 40,
            spriteImages: [{
                name: "stand",
                count: 4,
                directions: 8
            }],
        },
        "wraith": {
            name: "wraith",
            cost: 600,
            canConstruct: true,
            pixelWidth: 30,
            pixelHeight: 30,
            canAttack: true,
            canAttackLand: false,
            canAttackAir: true,
            weaponType: "fireball",
            pixelOffsetX: 15,
            pixelOffsetY: 15,
            radius: 15,
            sight: 8,
            speed: 40,
            turnSpeed: 4,
            hitPoints: 50,
            pixelShadowHeight: 40,
            spriteImages: [{
                name: "stand",
                count: 1,
                directions: 8
            }],
        }
    },
    defaults: {
        type: "aircraft",
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
            // Cień statku powietrznego znajduje się w trzecim rzędzie arkusza sprite’ów
            let shadowOffset = this.pixelHeight * 3;
            // Rysujemy obiekt pixelShadowHeight pikseli nad jego pozycją
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y - this.pixelShadowHeight, this.pixelWidth, this.pixelHeight);
            // W pozycji statku powietrznego rysujemy cień
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, shadowOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
        },
        drawLifeBar: function () {
            let x = this.drawingX;
            let y = this.drawingY - 2 * this.lifeBarHeight - this.pixelShadowHeight;
            game.foregroundContext.fillStyle = (this.lifeCode === "healthy") ? this.lifeBarHealthyFillColor : this.lifeBarDamagedFillColor;
            game.foregroundContext.fillRect(x, y, this.pixelWidth * this.life / this.hitPoints, this.lifeBarHeight);
            game.foregroundContext.strokeStyle = this.lifeBarBorderColor;
            game.foregroundContext.lineWidth = 1;
            game.foregroundContext.strokeRect(x, y, this.pixelWidth, this.lifeBarHeight);
        },
        drawSelection: function () {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY - this.pixelShadowHeight;
            game.foregroundContext.strokeStyle = this.selectionBorderColor;
            game.foregroundContext.fillStyle = this.selectionFillColor;
            game.foregroundContext.lineWidth = 2;
            // Rysujemy wypełnione koło wokół pojazdu powietrznego
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
            game.foregroundContext.stroke();
            game.foregroundContext.fill();
            // Rysujemy okrąg wokół cienia pojazdu powietrznego
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y + this.pixelShadowHeight, 4, 0, Math.PI * 2, false);
            game.foregroundContext.stroke();
            // Łączymy linią środek dwóch kół
            game.foregroundContext.beginPath();
            game.foregroundContext.moveTo(x, y);
            game.foregroundContext.lineTo(x, y + this.pixelShadowHeight);
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
                    // Przesuwamy się w kierunku docelowym, aż odległość od miejsca docelowego
                    // będzie mniejsza niż promień statku powietrznego
                    if (distanceFromDestination < radius) {
                        this.orders = {
                            type: "stand"
                        };
                    } else {
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }
                    break;
                case "stand":
                    // Szukamy celów w polu rażenia
                    targets = this.findTargetsInSight();
                    if (targets.length > 0) {
                        this.orders = {
                            type: "attack",
                            to: targets[0]
                        };
                    }
                    break;
                case "sentry":
                    // Szukamy celów znajdujących się maksymalnie w odległości do 2 kwadratów poza polem rażenia
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
                    // Sprawdzamy, czy obiekt aircraft jest w polu rażenia celu
                    if (this.isTargetInSight(this.orders.to)) {
                        // Obracamy się w kierunku celu i zaczynamy atakowanie, gdy cel znajdzie się w polu rażenia
                        var targetDirection = this.findAngleForFiring(this.orders.to);
                        // W razie potrzeby obracamy się w kierunku celu
                        this.turnTo(targetDirection);
                        // Sprawdzamy, czy obiekt aircraft skończył obracanie
                        if (!this.turning) {
                            // Jeśli przeładowanie się zakończyło, wystrzeliwujemy pocisk
                            if (!this.reloadTimeLeft) {
                                this.reloadTimeLeft = bullets.list[this.weaponType].reloadTime;
                                var angleRadians = -(targetDirection / this.directions) * 2 * Math.PI;
                                var bulletX = this.x - (this.radius * Math.sin(angleRadians) / game.gridSize);
                                var bulletY = this.y - (this.radius * Math.cos(angleRadians) / game.gridSize) - this.pixelShadowHeight / game.gridSize;
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
                        // Przesuwamy się w kierunku celu
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
                    // Przenosimy się w kierunku docelowym, aż znajdzie się w zakresie naszego rażenia
                    if (distanceFromDestination < this.sight) {
                        // Zamieniamy pozycje to i from
                        var to = this.orders.to;
                        this.orders.to = this.orders.from;
                        this.orders.from = to;
                    } else {
                        // Przenosimy się w kierunku nowego celu
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }
                    break;
                case "guard":
                    // Jeśli chroniony element jest zniszczony, anulujemy bieżące polecenie
                    if (this.orders.to.lifeCode === "dead") {
                        this.cancelCurrentOrder();
                        break;
                    }
                    // Jeśli cel znajduje się w polu rażenia
                    if (distanceFromDestination < this.sight) {
                        // Szukamy wrogów w pobliżu
                        targets = this.findTargetsInSight(1);
                        if (targets.length > 0) {
                            // Atakujemy najbliższy cel, ale zapisujemy polecenie order w zmiennej previousOrder
                            this.orders = {
                                type: "attack",
                                to: targets[0],
                                previousOrder: this.orders
                            };
                            break;
                        }
                    } else {
                        // Przenosimy się w pobliże nowego celu
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }
                    break;
            }
        },
        // Jak wolno jednostka powinna się poruszać podczas zmiany kierunku
        speedAdjustmentWhileTurningFactor: 0.4,
        moveTo: function (destination, distanceFromDestination) {
            // Sprawdzamy, w jakim kierunku należy się obrócić, aby dotrzeć do miejsca docelowego
            let newDirection = this.findAngle(destination);
            // W razie potrzeby obracamy się w nowym kierunku
            this.turnTo(newDirection);
            // Obliczamy maksymalną odległość, o jaką statek powietrzny może się przesunąć w cyklu animacji
            let maximumMovement = this.speed * this.speedAdjustmentFactor * (this.turning ?
                this.speedAdjustmentWhileTurningFactor : 1);
            let movement = Math.min(maximumMovement, distanceFromDestination);
            // Obliczamy komponenty x i y ruchu
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;
            this.lastMovementX = -(movement * Math.sin(angleRadians));
            this.lastMovementY = -(movement * Math.cos(angleRadians));
            this.x = this.x + this.lastMovementX;
            this.y = this.y + this.lastMovementY;
        },
    },
    load: loadItem,
    add: addItem,
};