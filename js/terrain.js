var terrain = {
    list: {
        "oilfield": {
            name: "oilfield",
            pixelWidth: 40,
            pixelHeight: 60,
            baseWidth: 40,
            baseHeight: 20,
            pixelOffsetX: 0,
            pixelOffsetY: 40,
            buildableGrid: [
                [1, 1]
            ],
            passableGrid: [
                [0, 0]
            ],
            spriteImages: [{
                    name: "hint",
                    count: 1
                },
                {
                    name: "stand",
                    count: 1
                }
            ],
        },
        "bigrocks": {
            name: "bigrocks",
            pixelWidth: 40,
            pixelHeight: 70,
            baseWidth: 40,
            baseHeight: 40,
            pixelOffsetX: 0,
            pixelOffsetY: 30,
            buildableGrid: [
                [1, 1],
                [0, 1]
            ],
            passableGrid: [
                [1, 1],
                [0, 1]
            ],
            spriteImages: [{
                name: "stand",
                count: 1
            }],
        },
        "smallrocks": {
            name: "smallrocks",
            pixelWidth: 20,
            pixelHeight: 35,
            baseWidth: 20,
            baseHeight: 20,
            pixelOffsetX: 0,
            pixelOffsetY: 15,
            buildableGrid: [
                [1]
            ],
            passableGrid: [
                [1]
            ],
            spriteImages: [{
                name: "stand",
                count: 1
            }],
        },
    },
    defaults: {
        type: "terrain",
        selectable: false,
        animate: function () {
            // Nie ma potrzeby sprawdzać kondycji terenu. Wywołujemy tylko metodę processActions
            this.processActions();
        },
        processActions: function () {
            // Ponieważ nie korzystamy z animacji ani innych specjalnych działań, wystarczy ustawić właściwość
            // imageList na podstawie zmiennej action
            this.imageList = this.spriteArray[this.action];
            this.imageOffset = this.imageList.offset;
        },
        drawSprite: function () {
            let x = this.drawingX;
            let y = this.drawingY;
            var colorOffset = 0; // Teren nie ma koloru związanego z zespołem
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
        }
    },
    load: loadItem,
    add: addItem,
};