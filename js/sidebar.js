var sidebar = {
    init: function () {
        this.cash = document.getElementById("cash");
        let buttons = document.getElementById("sidebarbuttons").getElementsByTagName("input");
        Array.prototype.forEach.call(buttons, function (button) {
            button.addEventListener("click", function () {
                // Atrybut id przycisku jest nazwą obiektu, który należy skonstruować
                let name = this.id;
                let details = sidebar.constructables[name];
                if (details.type === "buildings") {
                    sidebar.constructBuilding(details);
                } else {
                    sidebar.constructInStarport(details);
                }
            });
        });
    },
    animate: function () {
        // Wyświetlanie bieżącej wartości bilansu gotówki
        this.updateCash(game.cash[game.team]);
        // Włączamy przyciski, jeśli gracz ma wystarczająco dużo gotówki i zaznaczony jest odpowiedni budynek
        this.enableSidebarButtons();
        // Jeśli pasek boczny znajduje się w trybie deployBuilding, sprawdzamy, czy można umieścić budynek
        if (this.deployBuilding) {
            this.checkBuildingPlacement();
        }
    },
    // Zapisujemy wartość, aby uniknąć niepotrzebnych aktualizacji DOM
    _cash: undefined,
    updateCash: function (cash) {
        // Uaktualniamy wartość DOM, tylko jeśli różni się od zapisanej
        if (this._cash !== cash) {
            this._cash = cash;
            // Wyświetlamy sformatowaną ilość gotówki
            this.cash.innerHTML = cash.toLocaleString();
        }
    },
    constructables: undefined,
    initRequirementsForLevel: function () {
        this.constructables = {};
        let constructableTypes = ["buildings", "vehicles", "aircraft"];
        constructableTypes.forEach(function (type) {
            for (let name in window[type].list) {
                let details = window[type].list[name];
                let isInRequirements = game.currentLevel.requirements[type].indexOf(name) > -1;
                if (details.canConstruct) {
                    sidebar.constructables[name] = {
                        name: name,
                        type: type,
                        permitted: isInRequirements,
                        cost: details.cost,
                        constructedIn: (type === "buildings") ? "base" : "starport"
                    };
                }
            }
        });
    },
    enableSidebarButtons: function () {
        let cashBalance = game.cash[game.team];
        // Sprawdzamy, czy gracz zaznaczył budynek typu base lub starport
        let baseSelected = false;
        let starportSelected = false;
        game.selectedItems.forEach(function (item) {
            if (item.team === game.team && item.lifeCode === "healthy" && item.action === "stand") {
                if (item.name === "base") {
                    baseSelected = true;
                } else if (item.name === "starport") {
                    starportSelected = true;
                }
            }
        });
        for (let name in this.constructables) {
            let item = this.constructables[name];
            let button = document.getElementById(name);
            // Sprawdzamy, czy gracz ma wystarczająco dużo pieniędzy, aby kupić element
            let sufficientMoney = cashBalance >= item.cost;
            // Sprawdzamy, czy gracz zaznaczył odpowiedni budynek
            let correctBuilding = (baseSelected && item.constructedIn === "base") ||
                (starportSelected && item.constructedIn === "starport");
            button.disabled = !(item.permitted && sufficientMoney && correctBuilding);
        }
    },
    constructInStarport: function (details) {
        // Szukamy zaznaczonego budynku starport, który może skonstruować jednostkę
        let starport;
        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            let item = game.selectedItems[i];
            if (item.name === "starport" && item.team === game.team &&
                item.lifeCode === "healthy" && item.action === "stand") {
                starport = item;
                break;
            }
        }
        // Jeśli znajdziemy odpowiedni budynek typu starport, nakazujemy mu utworzenie jednostki
        if (starport) {
            game.sendCommand([starport.uid], {
                type: "construct-unit",
                details: details
            });
        }
    },
    constructBuilding: function (details) {
        sidebar.deployBuilding = details;
    },
    checkBuildingPlacement: function () {
        let name = sidebar.deployBuilding.name;
        let details = buildings.list[name];
        // Tworzymy siatkę zawierającą obszary, na których można umieścić budynki
        game.rebuildBuildableGrid();
        // Za pomocą zmiennej buildableGrid sprawdzamy, gdzie można umieścić budynek
        let canDeployBuilding = true;
        let placementGrid = game.makeArrayCopy(details.buildableGrid);
        for (let y = placementGrid.length - 1; y >= 0; y--) {
            for (let x = placementGrid[y].length - 1; x >= 0; x--) {
                // Jeśli kafelek musi być dostępny do zabudowy
                if (placementGrid[y][x] === 1) {
                    // Sprawdzamy, czy kafelek znajduje się na mapie i czy można go zabudować
                    if (mouse.gridY + y >= game.currentMap.mapGridHeight ||
                        mouse.gridX + x >= game.currentMap.mapGridWidth ||
                        fog.grid[game.team][mouse.gridY + y][mouse.gridX + x] ||
                        game.currentMapBuildableGrid[mouse.gridY + y][mouse.gridX + x]) {
                        // W przeciwnym razie oznaczamy kafelek jako niezdatny do zabudowy
                        canDeployBuilding = false;
                        placementGrid[y][x] = 2;
                    }
                }
            }
        }
        sidebar.placementGrid = placementGrid;
        sidebar.canDeployBuilding = canDeployBuilding;
    },
    cancelDeployingBuilding: function () {
        sidebar.deployBuilding = undefined;
        sidebar.placementGrid = undefined;
        sidebar.canDeployBuilding = false;
    },
    finishDeployingBuilding: function () {
        // Szukamy zaznaczonego obiektu base, który może skonstruować jednostkę
        let base;
        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            let item = game.selectedItems[i];
            if (item.name === "base" && item.team === game.team &&
                item.lifeCode === "healthy" && item.action === "stand") {
                base = item;
                break;
            }
        }
        // Jeśli zostanie znaleziony odpowiedni obiekt typu base, nakazujemy mu skonstruowanie jednostki
        if (base) {
            let name = sidebar.deployBuilding.name;
            let details = {
                name: name,
                type: "buildings",
                x: mouse.gridX,
                y: mouse.gridY
            };
            game.sendCommand([base.uid], {
                type: "construct-building",
                details: details
            });
        }
        // Resetujemy zmienne potrzebne do konstruowania budynku
        sidebar.cancelDeployingBuilding();
    },
};