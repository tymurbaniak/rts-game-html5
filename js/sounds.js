var sounds = {
    list: {
        "bullet": ["bullet1", "bullet2"],
        "heatseeker": ["heatseeker1", "heatseeker2"],
        "fireball": ["laser1", "laser2"],
        "cannon-ball": ["cannon1", "cannon2"],
        "message-received": ["message"],
        "acknowledge-attacking": ["engaging"],
        "acknowledge-moving": ["yup", "roger1", "roger2"],
    },
    loaded: {},
    init: function () {
        // Iterujemy nazwy dźwięków z listy i dla każdej z nich wczytujemy plik dźwiękowy
        for (let soundName in this.list) {
            let sound = {
                // Zapisujemy licznik, aby śledzić, który dźwięk zostanie odtworzony jako następny
                counter: 0
            };
            sound.audioObjects = [];
            this.list[soundName].forEach(function (fileName) {
                sound.audioObjects.push(loader.loadSound("audio/" + fileName));
            }, this);
            this.loaded[soundName] = sound;
        }
    },
    play: function (soundName) {
        let sound = sounds.loaded[soundName];
        if (sound) {
            // Odtwarzamy dźwięk dla nazwy uzyskanej na podstawie licznika
            let audioObject = sound.audioObjects[sound.counter];
            audioObject.play();
            // Następnym razem odtworzymy kolejny dźwięk
            sound.counter++;
            if (sound.counter >= sound.audioObjects.length) {
                sound.counter = 0;
            }
        }
    }
};