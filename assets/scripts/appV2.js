$(document).ready(function () {

    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyCe8LHgpvXS4W04GpBO8kCCFBSQCgATicM",
        authDomain: "rockpaperscissors-22e12.firebaseapp.com",
        databaseURL: "https://rockpaperscissors-22e12.firebaseio.com",
        projectId: "rockpaperscissors-22e12",
        storageBucket: "rockpaperscissors-22e12.appspot.com",
        messagingSenderId: "811340232539"
    };
    firebase.initializeApp(config);

    // Create a variable to reference the database.
    let database = firebase.database();

    function RPSGame() {
        this.playerName = null;
        this.playerKey = null;
        this.opponentName = null;
        this.opponentKey = null;
        this.wins = 0;
        this.losses = 0;
        this.playMade = null;

        this.statusElement = $("#gameMessages");
        this.localPlayerToolsElements = $(".localPlayerTools img");
    }


    RPSGame.prototype.setGameMessage = function (message) {
        this.statusElement.text(message);
    };

    RPSGame.prototype.setOpponent = function (key, name) {
        this.opponentKey = key;
        this.opponentName = name;
        $("#remotePlayerName").text(this.opponentName);
    };

    RPSGame.prototype.incrementWins = function () {
        this.wins++;
        $("#localPlayerWins").text(this.wins);
        database.ref("players").child(this.playerKey).update({ wins: this.wins });
    };

    RPSGame.prototype.incrementLosses = function () {
        this.losses++;
        $("#localPlayerLosses").text(this.losses);
        database.ref("players").child(this.playerKey).update({ losses: this.losses });
    };

    RPSGame.prototype.resetPlayMade = function () {
        this.playMade = "";
        this.localPlayerToolsElements.show();
        this.localPlayerToolsElements.addClass("clickable");
    };

    RPSGame.prototype.setPlayMade = function (play) {
        this.playMade = play;
        this.localPlayerToolsElements.hide();
        this.localPlayerToolsElements.removeClass("clickable");
        $("#" + this.playMade).show();
        database.ref("players").child(this.playerKey).update({ playMade: this.playMade });
    };

    // create an even handler that listens for form submittal to get player name & creates object
    RPSGame.prototype.state1GetPlayerName = function () {
        console.log("state1GetPlayerName: listening for player name");
        this.setGameMessage("Please enter your name.");

        let form = $("#nameSelection");
        let self = this;
        form.on("submit", function (event) {
            event.preventDefault();
            // validates the input from the user's name
            if (form[0].checkValidity() === false) {
                event.stopPropagation();
                form[0].classList.add('was-validated');
            }
            else { // form input is valid
                form.hide().off();
                self.playerName = $("#localPlayerNameInput").val().trim();
                $("#localPlayerName").text(self.playerName);

                // make a key for yourself
                self.playerKey = database.ref("players").push().key;
                // check if anyone is available to play and give them your key as your create 
                // your user object
                database.ref("players").once('value').then(function (snapshot) {
                    let sv = snapshot.val();

                    for (var key in sv) {
                        //console.log(key + " -> " + sv[key]);
                        // claim the first availableGameSession
                        if (sv[key].opponentKey == "") {
                            // update the other user so they know they have an opponent
                            database.ref("players").child(key).update({
                                opponentKey: self.playerKey,
                                opponentName: self.playerName
                            });
                            // update game session with this local player's name so remote gets it
                            self.setOpponent(key, sv[key].name);
                            break;
                        }
                    }
                    // create your user
                    database.ref("players").child(self.playerKey).update({
                        key: self.playerKey,
                        opponentKey: (self.opponentKey ? self.opponentKey : ""),
                        opponentName: (self.opponentName ? self.opponentName : ""),
                        name: self.playerName,
                        wins: 0,
                        losses: 0,
                        playMade: "",
                        messageToSend: ""
                    });

                    if (self.opponentKey) {
                        self.goToState3RevealOpponent();
                    }
                    else {
                        self.goToState2WaitForOpponent();
                    }
                });
            }
        });
    };

    RPSGame.prototype.goToState2WaitForOpponent = function () {
        console.log("goToState2WaitForOpponent: waiting for someone to claim us");
        this.setGameMessage("Waiting for an opponent...");

        let self = this;
        let databaseRef = "players/" + this.playerKey;
        database.ref(databaseRef).on("value", function (snapshot) {
            let sv = snapshot.val(); // is this "on" set up correctly to only listen to my one object?
            if (self.opponentKey != "" && sv.opponentKey != "") { // we have an opponent
                console.log("How many times is this called?");
                database.ref(databaseRef).off(); // stop listening to ourselves, we will listen to the opponent
                // update game session with this local player's name so remote gets it
                self.setOpponent(sv.opponentKey, sv.opponentName);
                self.goToState3RevealOpponent();
            }
        });
    };

    RPSGame.prototype.goToState3RevealOpponent = function () {
        this.setGameMessage("Your opponent is " + this.opponentName + ".");

        // wait a second and then tell them to make a move
        let self = this;
        setTimeout(function () {
            self.goToState4MakeAMove();
        }, 1000);
    };

    RPSGame.prototype.goToState4MakeAMove = function () {
        this.setGameMessage("Get ready to choose!");

        this.resetPlayMade();
        let self = this;
        setTimeout(function () {
            self.setGameMessage("ROCK!");
        }, 1000);
        setTimeout(function () {
            self.setGameMessage("PAPER!");
        }, 2000);
        setTimeout(function () {
            self.setGameMessage("SCISSORS!");
        }, 3000);
        setTimeout(function () {
            self.setGameMessage("Shoot!");
            self.localPlayerToolsElements.on("click", function () {
                self.localPlayerToolsElements.off()
                self.setPlayMade($(this).attr("id"));

                self.goToState5WaitForPlay();
            });
        }, 4000);
    };

    RPSGame.prototype.updateRemotePlayerWinsLosses = function () {
        let databaseRef = "players/" + this.opponentKey;
        database.ref(databaseRef).once('value').then(function (snapshot) {
            let sv = snapshot.val();
            $("#remotePlayerWins").text(sv.wins);
            $("#remotePlayerLosses").text(sv.losses);
        });
    };

    RPSGame.prototype.goToState5WaitForPlay = function () {
        this.setGameMessage("Waiting for opponent...");

        let self = this;
        let databaseRef = "players/" + this.opponentKey;
        database.ref(databaseRef).on('value', function (snapshot) {
            let sv = snapshot.val();
            if (sv.playMade != "") {
                database.ref(databaseRef).off();
                // acknowledge receipt of move by resetting it
                database.ref("players").child(self.opponentKey).update({ playMade: "" });
                if (self.playMade == sv.playMade) {
                    self.setGameMessage("Opponent played " + sv.playMade + ". TIE!");
                }
                else if (self.playMade == "rock" && sv.playMade == "scissors" ||
                    self.playMade == "paper" && sv.playMade == "rock" ||
                    self.playMade == "scissors" && sv.playMade == "paper") {
                    self.setGameMessage("Opponent played " + sv.playMade + ". You win!");
                    self.incrementWins();
                }
                else {
                    self.setGameMessage("Opponent played " + sv.playMade + ". You lose!");
                    self.incrementLosses();
                }
                setTimeout(function () {
                    self.updateRemotePlayerWinsLosses();
                    self.goToState4MakeAMove();
                }, 2000);
            }
        });
    };


    let game = new RPSGame();
    game.state1GetPlayerName();

});