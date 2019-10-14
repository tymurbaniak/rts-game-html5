var bullets = {
    list: {
        "fireball": {
            name: "fireball",
            speed: 60,
            reloadTime: 30,
            range: 8,
            damage: 10,
            spriteImages: [{
                    name: "fly",
                    count: 1,
                    directions: 8
                },
                {
                    name: "explode",
                    count: 7
                }
            ],
        },
        "heatseeker": {
            name: "heatseeker",
            reloadTime: 40,
            speed: 25,
            range: 9,
            damage: 20,
            turnSpeed: 2,
            spriteImages: [{
                    name: "fly",
                    count: 1,
                    directions: 8
                },
                {
                    name: "explode",
                    count: 7
                }
            ],
        },
        "cannon-ball": {
            name: "cannon-ball",
            reloadTime: 5,
            speed: 25,
            damage: 10,
            range: 6,
            spriteImages: [{
                    name: "fly",
                    count: 1,
                    directions: 8
                },
                {
                    name: "explode",
                    count: 7
                }
            ],
        },
        "bullet": {
            name: "bullet",
            damage: 5,
            speed: 50,
            range: 5,
            reloadTime: 20,
            spriteImages: [{
                    name: "fly",
                    count: 1,
                    directions: 8
                },
                {
                    name: "explode",
                    count: 3
                }
            ],
        }
    },
    defaults: {
        type: "bullets",
        canMove: true,
        distanceTravelled: 0,
        directions: 8,
        pixelWidth: 10,
        pixelHeight: 11,
        pixelOffsetX: 5,
        pixelOffsetY: 5,
        radius: 6,
        action: "fly",
        selected: false,
        selectable: false,
        orders: {
            type: "fire"
        },
        // Jak szybko pocisk powinien się poruszać podczas obrotu
        speedAdjustmentWhileTurningFactor: 1,
        moveTo: function (destination) {
            // Pociski, na przykład sterowane ciepłem, podczas ruchu mogą się powoli obracać w kierunku celu
            if (this.turnSpeed) {
                // Sprawdzamy, gdzie należy się obrócić, aby osiągnąć cel
                var newDirection = this.findAngleForFiring(destination);
                // W razie potrzeby obracamy się w nowym kierunku
                this.turnTo(newDirection);
            }
            // Obliczamy maksymalną odległość, na jaką pocisk może się przesunąć w cyklu animacji
            let maximumMovement = this.speed * this.speedAdjustmentFactor;
            let movement = maximumMovement;
            // Obliczamy komponenty x i y ruchu
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;
            this.lastMovementX = -(movement * Math.sin(angleRadians));
            this.lastMovementY = -(movement * Math.cos(angleRadians));
            this.x = this.x + this.lastMovementX;
            this.y = this.y + this.lastMovementY;
            // Śledzimy odległość przebytą przez pocisk
            this.distanceTravelled += movement;
        },
        reachedTarget: function () {
            var item = this.target;
            if (item.type === "buildings") {
                return (item.x <= this.x && item.x >= this.x - item.baseWidth / game.gridSize && item.y <= this.y && item.y >= this.y - item.baseHeight / game.gridSize);
            } else if (item.type === "aircraft") {
                return (Math.pow(item.x - this.x, 2) + Math.pow(item.y - (this.y + item.pixelShadowHeight / game.gridSize), 2) < Math.pow((item.radius) / game.gridSize, 2));
            } else {
                return (Math.pow(item.x - this.x, 2) + Math.pow(item.y - this.y, 2) < Math.pow((item.radius) / game.gridSize, 2));
            }
        },
        processOrders: function () {
            this.lastMovementX = 0;
            this.lastMovementY = 0;
            switch (this.orders.type) {
                case "fire":
                    // Przesuwamy się w kierunku docelowym i zatrzymujemy się, gdy znajdujemy się blisko lub
                    // znajdziemy się poza celem
                    var reachedTarget = false;
                    if (this.distanceTravelled > this.range ||
                        (reachedTarget = this.reachedTarget())) {
                        if (reachedTarget) {
                            // Pocisk niszczy cel i wybucha
                            this.target.life -= this.damage;
                            this.orders = {
                                type: "explode"
                            };
                            this.action = "explode";
                            this.animationIndex = 0;
                        } else {
                            // Pocisk wypala się bez osiągnięcia celu
                            game.remove(this);
                        }
                    } else {
                        this.moveTo(this.target);
                    }
                    break;
            }
        },
        animate: function () {
            // Nie ma potrzeby sprawdzania stanu terenu. Wystarczy wywołać processActions
            this.processActions();
        },
        processActions: function () {
            let direction = Math.round(this.direction) % this.directions;
            switch (this.action) {
                case "fly":
                    this.imageList = this.spriteArray["fly-" + direction];
                    this.imageOffset = this.imageList.offset;
                    break;
                case "explode":
                    this.imageList = this.spriteArray["explode"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;
                    if (this.animationIndex >= this.imageList.count) {
                        // Pocisk wybucha i znika
                        game.remove(this);
                    }
                    break;
            }
        },
        drawSprite: function () {
            let x = this.drawingX;
            let y = this.drawingY;
            let colorOffset = 0; // Brak osobnych kolorów dla pocisków różnych zespołów
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset *
                this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y,
                this.pixelWidth, this.pixelHeight);
        },
    },
    load: loadItem,
    add: addItem,
};