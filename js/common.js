var loader = {
    loaded: true,
    loadedCount: 0, // Zasoby, które zostały dotychczas wczytane
    totalCount: 0, // Całkowita liczba zasobów, które oczekują na wczytanie
    init: function () {
        // Sprawdzamy wsparcie dla zasobów dźwiękowych
        var mp3Support, oggSupport;
        var audio = document.createElement("audio");
        if (audio.canPlayType) {
            // Obecnie metoda canPlayType() zwraca: "", "maybe" lub "probably"
            mp3Support = "" !== audio.canPlayType("audio/mpeg");
            oggSupport = "" !== audio.canPlayType("audio/ogg; codecs=\"vorbis\"");
        } else {
            // Brak wsparcia dla znacznika audio
            mp3Support = false;
            oggSupport = false;
        }
        // Sprawdzamy wsparcie formatu ogg, następnie mp3, a w razie niepowodzenia ustawiamy wartość zmiennej
        // soundFileExtn na undefined
        loader.soundFileExtn = oggSupport ? ".ogg" : mp3Support ? ".mp3" : undefined;
    },
    loadImage: function (url) {
        this.loaded = false;
        this.totalCount++;
        game.showScreen("loadingscreen");
        var image = new Image();
        image.addEventListener("load", loader.itemLoaded, false);
        image.src = url;
        return image;
    },
    soundFileExtn: ".ogg",
    loadSound: function (url) {
        this.loaded = false;
        this.totalCount++;
        game.showScreen("loadingscreen");
        var audio = new(window.wAudio || Audio)();
        var audio = new Audio();
        audio.addEventListener("canplaythrough", loader.itemLoaded, false);
        audio.src = url + loader.soundFileExtn;
        return audio;
    },
    itemLoaded: function (ev) {
        // Przestajemy oczekiwać na typ zdarzenia (load lub canplaythrough) dla elementu, który został już wczytany
        ev.target.removeEventListener(ev.type, loader.itemLoaded, false);
        loader.loadedCount++;
        document.getElementById("loadingmessage").innerHTML = "Loaded " + loader.loadedCount + " of " + loader.totalCount;
        if (loader.loadedCount === loader.totalCount) {
            // Wczytywanie zostało zakończone
            // Resetujemy i czyścimy obiekt wczytujący
            loader.loaded = true;
            loader.loadedCount = 0;
            loader.totalCount = 0;
            // Ukrywamy ekran wczytywania
            game.hideScreen("loadingscreen");
            // i wywołujemy metodę loader.onload, o ile istnieje
            if (loader.onload) {
                loader.onload();
                loader.onload = undefined;
            }
        }
    },
};

// Domyślna metoda load() wykorzystywana przez wszystkie encje naszej gry
function loadItem(name) {
    var item = this.list[name];
    // Jeśli została wczytana tablica sprite’ów danego elementu, nie musimy tego powtarzać
    if (item.spriteArray) {
        return;
    }
    item.spriteSheet = loader.loadImage("images/" + this.defaults.type + "/" + name + ".png");
    item.spriteArray = [];
    item.spriteCount = 0;
    item.spriteImages.forEach(function (spriteImage) {
        let constructImageCount = spriteImage.count;
        let constructDirectionCount = spriteImage.directions;
        if (constructDirectionCount) {
            // Jeśli zdefiniowane są już kierunki obrazu spriteImage, zapisujemy sprite’y każdego kierunku w tablicy spriteArray
            for (let i = 0; i < constructDirectionCount; i++) {
                let constructImageName = spriteImage.name + "-" + i;
                item.spriteArray[constructImageName] = {
                    name: constructImageName,
                    count: constructImageCount,
                    offset: item.spriteCount
                };
                item.spriteCount += constructImageCount;
            }
        } else {
            // Jeśli nie zostały jeszcze zdefiniowane kierunki obrazu spriteImage, zapisujemy tylko jego nazwę i liczbę
            // obrazów w tablicy spriteArray
            let constructImageName = spriteImage.name;
            item.spriteArray[constructImageName] = {
                name: constructImageName,
                count: constructImageCount,
                offset: item.spriteCount
            };
            item.spriteCount += constructImageCount;
        }
    });

    // Wczytujemy broń, jeśli element ją ma
    if (item.weaponType) {
        bullets.load(item.weaponType);
    }
}

// Kod dla kilku przeglądarek, które nadal nie wspierają metody Object.assign
if (typeof Object.assign !== "function") {
    Object.assign = function (target, varArgs) { // parametr .length funkcji wynosi 2
        "use strict";
        if (target === null) { // TypeError jeśli nie jest zdefiniowany lub ma wartość null
            throw new TypeError("Wartości undefined lub null nie można przekształcić w obiekt");
        }
        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];
            if (nextSource != null) { // Pomijamy, jeśli zmienna ma wartość undefined lub null
                for (var nextKey in nextSource) {
                    // Unikamy błędów w przypadku przesłonięcia hasOwnProperty
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

// Domyślna metoda add() wykorzystywana przez wszystkie encje naszej gry
function addItem(details) {
    var name = details.name;
    // Inicjalizujemy element za pomocą wszystkich domyślnych właściwości odpowiednich dla tego elementu
    var item = Object.assign({}, baseItem);
    // Przypisujemy do elementu wszystkie domyślne właściwości odpowiednie dla jego kategorii
    Object.assign(item, this.defaults);
    // Przypisujemy właściwości obiektu na podstawie nazwy elementu
    Object.assign(item, this.list[name]);
    // Domyślnie ustawiamy żywotność elementu, przypisując do niego maksymalną liczbę uderzeń
    item.life = item.hitPoints;
    // Nadpisujemy domyślne właściwości na podstawie wartości w zmiennej details
    Object.assign(item, details);
    return item;
}

// Domyślne właściwości każdego elementu
var baseItem = {
    animationIndex: 0,
    direction: 0,
    selected: false,
    selectable: true,
    orders: {
        type: "stand"
    },
    action: "stand",

    // Domyślna metoda służąca do animowania elementu
    animate: function () {
        // Sprawdzamy kondycję elementu
        if (this.life > this.hitPoints * 0.4) {
            // Traktujemy element jako zdrowy, jeśli wartość właściwości life wynosi ponad 40%
            this.lifeCode = "healthy";
        } else if (this.life > 0) {
            // Traktujemy element jako uszkodzony, jeśli wartość właściwości life jest mniejsza niż 40%
            this.lifeCode = "damaged";
        } else {
            // Usuwamy element z gry, jeśli jego życie dobiegło końca (wartość zmiennej life wynosi 0 lub jest ujemna)
            this.lifeCode = "dead";
            game.remove(this);
            return;
        }
        // Przetwarzamy bieżącą akcję
        this.processActions();
    },
    // Domyślna metoda rysowania elementu
    draw: function () {
        // Obliczamy współrzędne pikseli względem obiektu canvas, aby narysować element
        this.drawingX = (this.x * game.gridSize) - game.offsetX - this.pixelOffsetX;
        this.drawingY = (this.y * game.gridSize) - game.offsetY - this.pixelOffsetY;

        // Poprawka na podstawie współczynnika interpolacji
        if (this.canMove) {
            this.drawingX += this.lastMovementX * game.drawingInterpolationFactor * game.gridSize;
            this.drawingY += this.lastMovementY * game.drawingInterpolationFactor * game.gridSize;
        }

        if (this.selected) {
            this.drawSelection();
            this.drawLifeBar();
        }
        this.drawSprite();

        // Rysujemy blask wokół teleportującej się jednostki
        if (this.brightness) {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY - (this.pixelShadowHeight ?
                this.pixelShadowHeight : 0);
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
            game.foregroundContext.fillStyle = "rgba(255,255,255," + this.brightness + ")";
            game.foregroundContext.fill();
        }
    },
    /* Właściwości dotyczące ruchu */
    speedAdjustmentFactor: 1 / 64,
    turnSpeedAdjustmentFactor: 1 / 8,
    // Szukamy kąta w kierunku docelowym (0 <= kąt < directions)
    findAngle: function (destination) {
        var dy = destination.y - this.y;
        var dx = destination.x - this.x;
        // Przekształcamy arctangens w wartość z zakresu 0 - directions
        var angle = this.directions / 2 - (Math.atan2(dx, dy) * this.directions / (2 * Math.PI));
        angle = (angle + this.directions) % this.directions;
        return angle;
    },
    // Zwracamy najmniejszą różnicę (między -directions/2 oraz +directions/2) w kierunku newDirection
    angleDiff: function (newDirection) {
        let currentDirection = this.direction;
        let directions = this.directions;
        // Obydwa kierunki powinny mieć wartość między -directions/2 i +directions/2
        if (currentDirection >= directions / 2) {
            currentDirection -= directions;
        }
        if (newDirection >= directions / 2) {
            newDirection -= directions;
        }
        var difference = newDirection - currentDirection;
        // Gwarantujemy, że różnica również będzie spomiędzy -directions/2 i +directions/2
        if (difference < -directions / 2) {
            difference += directions;
        }
        if (difference > directions / 2) {
            difference -= directions;
        }
        return difference;
    },
    turnTo: function (newDirection) {
        // Obliczamy różnicę między nowym a bieżącym kierunkiem
        let difference = this.angleDiff(newDirection);
        // Obliczamy maksymalny obrót statku powietrznego w cyklu animacji
        let turnAmount = this.turnSpeed * this.turnSpeedAdjustmentFactor;
        if (Math.abs(difference) > turnAmount) {
            // Zmieniamy kierunek o wartość obrotu
            this.direction += turnAmount * Math.abs(difference) / difference;
            // Upewniamy się, że wartość kierunku nie jest mniejsza od 0 lub większa od this.directions
            this.direction = (this.direction + this.directions) % this.directions;
            this.turning = true;
        } else {
            this.direction = newDirection;
            this.turning = false;
        }
    },

    selectionBorderColor: "rgba(255,255,0,0.5)",
    selectionFillColor: "rgba(255,215,0,0.2)",
    lifeBarBorderColor: "rgba(0,0,0,0.8)",
    lifeBarHealthyFillColor: "rgba(0,255,0,0.5)",
    lifeBarDamagedFillColor: "rgba(255,0,0,0.5)",
    lifeBarHeight: 5,

    // Szukamy kąta w postaci kierunku, od środka miejsca początkowego i docelowego (0 <= angle < directions)
    findAngleForFiring: function (target) {
        var dy = target.y - this.y;
        var dx = target.x - this.x;
        // Dostosowujemy dx i dy, aby wskazywały środek obiektu docelowego
        if (target.type === "buildings") {
            dy += target.baseWidth / 2 / game.gridSize;
            dx += target.baseHeight / 2 / game.gridSize;
        } else if (target.type === "aircraft") {
            dy -= target.pixelShadowHeight / game.gridSize;
        }
        // Dostosowujemy dx i dy, aby początek znajdował się pośrodku miejsca początkowego
        if (this.type === "buildings") {
            dy -= this.baseWidth / 2 / game.gridSize;
            dx -= this.baseHeight / 2 / game.gridSize;
        } else if (this.type === "aircraft") {
            dy += this.pixelShadowHeight / game.gridSize;
        }
        // Przekształcamy wartość kąta na wartość z przedziału (0 - directions)
        var angle = this.directions / 2 - (Math.atan2(dx, dy) * this.directions / (2 * Math.PI));
        angle = (angle + this.directions) % this.directions;
        return angle;
    },

    isValidTarget: function (item) {
        // Nie można wycelować w jednostki, które są zniszczone lub należą do tego samego zespołu
        if (!item || item.lifeCode === "dead" || item.team === this.team) {
            return false;
        }
        if (item.type === "buildings" || item.type === "vehicles") {
            return this.canAttackLand;
        } else if (item.type === "aircraft") {
            return this.canAttackAir;
        }
    },
    isTargetInSight: function (item, sightBonus = 0) {
        return Math.pow(item.x - this.x, 2) + Math.pow(item.y - this.y, 2) <
            Math.pow(this.sight + sightBonus, 2);
    },
    findTargetsInSight: function (sightBonus = 0) {
        var targets = [];
        game.items.forEach(function (item) {
            if (this.isValidTarget(item) && this.isTargetInSight(item, sightBonus)) {
                targets.push(item);
            }
        }, this);
        // Sortujemy cele na podstawie odległości od atakującego
        var attacker = this;
        targets.sort(function (a, b) {
            return (Math.pow(a.x - attacker.x, 2) + Math.pow(a.y - attacker.y, 2)) -
                (Math.pow(b.x - attacker.x, 2) + Math.pow(b.y - attacker.y, 2));
        });
        return targets;
    },
    cancelCurrentOrder: function () {
        if (this.orders.previousOrder) {
            this.orders = this.orders.previousOrder;
        } else {
            this.orders = {
                type: "stand"
            };
        }
    },
};