var singleplayer = {
    // Rozpoczynamy kampanię jednego gracza
    start: function () {
        // Ukrywamy ekran menu początkowego
        game.hideScreens();
        // Rozpoczynamy pierwszy poziom
        singleplayer.currentLevel = 0;
        // Zaczynamy inicjalizować poziom
        singleplayer.initLevel();
    },
    currentLevel: 0,
    initLevel: function () {
        game.type = "singleplayer";
        game.team = "blue";
        // Nie pozwalamy graczowi na rozpoczęcie misji, dopóki nie zostaną wczytane wszystkie zasoby poziomu
        var enterMissionButton = document.getElementById("entermission");
        enterMissionButton.disabled = true;
        // Wczytujemy wszystkie elementy dla poziomu
        var level = levels.singleplayer[singleplayer.currentLevel];
        game.loadLevelData(level);
        fog.initLevel();
        game.offsetX = level.startX * game.gridSize;
        game.offsetY = level.startY * game.gridSize;
        // Po wczytaniu wszystkich zasobów aktywujemy przycisk rozpoczęcia misji

        game.createTerrainGrid();
        loader.onload = function () {
            enterMissionButton.disabled = false;
        };
        // Aktualizujemy tekst opisu misji i wyświetlamy ekran z opisem
        this.showMissionBriefing(level.briefing);
    },
    showMissionBriefing: function (briefing) {
        var missionBriefingText = document.getElementById("missionbriefing");
        // Zastępujemy \n w tekście dwoma znacznikami <br>, aby utworzyć nowy akapit
        missionBriefingText.innerHTML = briefing.replace(/\n/g, "<br><br>");
        // Wyświetlamy ekran z opisem misji
        game.showScreen("missionbriefingscreen");
    },
    exit: function () {
        // Wyświetlamy główne menu gry
        game.hideScreens();
        game.showScreen("gamestartscreen");
    },
    play: function () {
        // Jeden raz uruchamiamy pętlę animacji
        game.animationLoop();
        // Inicjalizujemy interwał pętli animacji
        game.animationInterval = setInterval(game.animationLoop, game.animationTimeout);
        game.start();
    },
    sendCommand: function (uids, details) {
        game.processCommand(uids, details);
    },
    endLevel: function (success) {
        clearInterval(game.animationInterval);
        game.end();
        if (success) {
            let moreLevels = (singleplayer.currentLevel < levels.singleplayer.length - 1);
            if (moreLevels) {
                game.showMessageBox("Misja wykonana.", function () {
                    game.hideScreens();
                    // Rozpoczynamy następny poziom
                    singleplayer.currentLevel++;
                    singleplayer.initLevel();
                });
            } else {
                game.showMessageBox("Misja wykonana.\nTo była ostatnia misja w kampanii.\nDziękujemy za grę.", function() {
                    game.hideScreens();
                    // Powrót do menu głównego
                    game.showScreen("gamestartscreen");
                });
        }
    } else {
        game.showMessageBox("Niepowodzenie misji.\nSpróbować ponownie?", function () {
            game.hideScreens();
            // Restartujemy bieżący poziom
            singleplayer.initLevel();
        }, function () {
            game.hideScreens();
            // Powrót do menu głównego
            game.showScreen("gamestartscreen");
        });
    }
}
};