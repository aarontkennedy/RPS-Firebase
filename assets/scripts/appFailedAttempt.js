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
    let databaseGamePath = "gameSessions";
    let database = firebase.database();

    function RPSGame() {
        this.gameSessionKey = null;
        this.playerName = null;
        this.amIPlayer1 = null;
        this.opponentName = null;
        this.statusElement = $("#gameMessages");
        this.localPlayerToolsElements = $(".clickable");
    }


    RPSGame.prototype.setGameMessage = function (message) {
        this.statusElement.text(message);
    };


    // create an even handler that listens for form submittal to get player name
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
                form.hide();
                form.off();
                self.playerName = $("#localPlayerNameInput").val().trim();
                $("#localPlayerName").text(self.playerName);
                self.goToState2GetAGameSession();
            }
        });
    };

    RPSGame.prototype.goToState2GetAGameSession = function () {
        console.log("goToState2GetAGameSession: check if a game session has already been created that we can join");
        this.setGameMessage("Setting up the game.");

        let self = this;
        database.ref(databaseGamePath).once('value').then(function (snapshot) {
            let sv = snapshot.val();
            let foundGameSession = false;
            //console.log(sv);
            for (var key in sv) {
                //console.log(key + " -> " + sv[key]);
                // claim the first availableGameSession
                if (!sv[key].claimed && sv[key].player1Name) {
                    foundGameSession = true;
                    self.gameSessionKey = key;
                    self.amIPlayer1 = false;
                    self.opponentName = sv[key].player1Name;
                    $("#remotePlayerName").text(self.opponentName);
                    // update game session with this local player's name so remote gets it
                    database.ref(databaseGamePath).child(self.gameSessionKey).update({
                        claimed: true,
                        player2Name: self.playerName
                    });

                    self.goToState4MakeAMove();
                    break;
                }
            }
            if (!foundGameSession) {  // create a new game session
                self.amIPlayer1 = true;
                // get and store the game session key for easy accessibility
                self.gameSessionKey = database.ref(databaseGamePath).push().key;
                database.ref(databaseGamePath).child(self.gameSessionKey).update({
                    key: self.gameSessionKey,
                    claimed: false,
                    player1Name: self.playerName,
                    player2Name: "",
                    player1Wins: 0,
                    player1Losses: 0,
                    player2Wins: 0,
                    player2Losses: 0,
                    player1Play: "",
                    player2Play: ""
                });
                self.goToState3WaitForNewOpponent();
            }
        });
    };

    RPSGame.prototype.goToState3WaitForNewOpponent = function () {
        console.log("goToState3WaitForNewOpponent: I am player 1, need player 2.");
        this.setGameMessage("Waiting for an opponent to join...");

        let self = this;
        database.ref(databaseGamePath /*+ "/" + this.gameSessionKey*/).on("child_changed", function (snapshot) {

            let sv = snapshot.val();
            if (sv.key == self.gameSessionKey) {
                self.opponentName = sv.player2Name;
                $("#remotePlayerName").text(self.opponentName);
                self.goToState4MakeAMove();
                database.ref(databaseGamePath).off();
            }
        });
    };

    RPSGame.prototype.goToState4MakeAMove = function () {
        console.log("goToState4MakeAMove: Make your move!");
        this.setGameMessage("Choose Rock, Paper, Scissors!");

        let self = this;
        this.localPlayerToolsElements.on("click", function () {
            self.localPlayerToolsElements.off().hide();
            $(this).show();

            console.log("You played " + $(this).attr("data-play"));

            let playMade = null;
            if (self.amIPlayer1) {
                playMade = { player1Play: $(this).attr("data-play") };
            }
            else {
                playMade = { player2Play: $(this).attr("data-play") };
            }
            database.ref(databaseGamePath).child(self.gameSessionKey).update(playMade);

            self.goToState5WaitForPlay();
        });
    };

    RPSGame.prototype.goToState5WaitForPlay = function () {
        console.log("goToState5WaitForPlay: Using an interval timer to check over and over if both have chosen.");
        this.setGameMessage(`Waiting for ${this.opponentName} choose.`);

        let self = this;
        let intervalID = setInterval(function () {
            // get a snapshot of the game session and check if both players' choices have been made.
            database.ref(databaseGamePath + "/" + self.gameSessionKey).once('value').then(function (snapshot) {
                let sv = snapshot.val();

                if (sv.player1Play != "" && sv.player2Play != "") {
                    clearInterval(intervalID);
                    console.log(sv.player1Play + " vs " + sv.player2Play);

                    $(".remotePlayerTools img").hide();
                    if (self.amIPlayer1) {
                        $("#remote-" + sv.player2Play).show();
                    }
                    else {
                        $("#remote-" + sv.player1Play).show();
                    }

                    if (sv.player1Play == sv.player2Play) {
                        self.setGameMessage(`It is a TIE!`);
                        // go to a new game - no update needed?
                    }
                    else { // someone won.  who?
                        let didPlayer1Win = false;
                        if (sv.player1Play == "rock" && sv.player2Play == "scissors" ||
                            sv.player1Play == "paper" && sv.player2Play == "rock" ||
                            sv.player1Play == "scissors" && sv.player2Play == "paper") {
                            didPlayer1Win = true;
                        }

                        if (self.amIPlayer1 && didPlayer1Win || !self.amIPlayer1 && !didPlayer1Win) {
                            self.setGameMessage(`You WIN!`);
                        }
                        else {
                            self.setGameMessage(`You LOSE!`);
                        }

                        /*
                                                database.ref(databaseGamePath).child(self.gameSessionKey).update({
                                                    claimed: true,
                                                    player2Name: self.playerName
                                                });
                        */

                    }
                }
            });
        }, 250);
    };

    let game = new RPSGame();
    game.state1GetPlayerName();

});