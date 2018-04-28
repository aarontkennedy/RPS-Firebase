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
        this.remotePlayerToolsElements = $(".remotePlayerTools img");
        this.localPlayerWinsElement = $("#localPlayerWins");
        this.localPlayerWinsElement = $("#localPlayerLosses");
        this.localPlayerWinsElement = $("#remotePlayerWins");
        this.localPlayerWinsElement = $("#remotePlayerLosses");
        this.chatElement = $("#chatDisplay");
        this.chatInput = $("#chatMessage");
        this.chatSubmitButton = $("#chatSubmit");
        this.remotePlayerNameElement = $("#remotePlayerName");
        this.remotePlayerWinsElement = $("#remotePlayerWins");
        this.remotePlayerLossesElement = $("#remotePlayerLosses");
        this.nameForm = $("#nameSelection");
        this.playerNameInput = $("#localPlayerNameInput");
        this.playerNameElement = $("#localPlayerName");
        this.localPlayerLossesElement = $("#localPlayerLosses");
        this.localPlayerWinsElement = $("#localPlayerWins");
        this.chatForm = $("#chatForm");
        this.chatForm.hide();

        this.playerPath = "players";
        this.chatPath = "chat"

        this.step5Timeout = null;
        this.step3Timeout = null;
        this.step4_1Timeout = null;
        this.step4_2Timeout = null;
        this.step4_3Timeout = null;
        this.step4_4Timeout = null;
    }

    // call this method when we have an opponent to listen to messages from
    RPSGame.prototype.listenForRemoteChatMessage = function () {
        let self = this;
        // don't listen to the whole opponent object - just the message child
        database.ref(this.playerPath).child(this.opponentKey).child("messageToSend").on("value",
            function (snapshot) {
                let message = snapshot.val();
                // once read, set the message to empty string
                if (message) {
                    database.ref(self.playerPath).child(self.opponentKey).update({ messageToSend: "" });

                    let pTag = $(`<p class="remoteChatMessage">${message}</p>`);
                    self.chatElement.append(pTag);
                    pTag[0].scrollIntoView(false);
                }
            });
    };
    RPSGame.prototype.stopListeningForRemoteChat = function () {
        database.ref(this.playerPath).child(this.opponentKey).child("messageToSend").off();
    };

    // call this method when we have an opponent to listen to wins and losses updates from
    RPSGame.prototype.listenForRemotePlayerWinsLosses = function () {
        let self = this;
        // don't listen to the whole opponent object - just the wins child
        database.ref(this.playerPath).child(this.opponentKey).child("wins").on("value",
            function (snapshot) {
                self.remotePlayerWinsElement.text(snapshot.val());
            });
        // don't listen to the whole opponent object - just the wins child
        database.ref(this.playerPath).child(this.opponentKey).child("losses").on("value",
            function (snapshot) {
                self.remotePlayerLossesElement.text(snapshot.val());
            });
    };
    RPSGame.prototype.stopListeningForRemotePlayerWinsLosses = function () {
        database.ref(this.playerPath).child(this.opponentKey).child("losses").off();
        database.ref(this.playerPath).child(this.opponentKey).child("wins").off();
        database.ref(this.playerPath).child(this.opponentKey).child("playMade").off();
    };


    RPSGame.prototype.startListeningForOpponentLeaving = function () {
        let self = this;
        database.ref(this.playerPath).child(this.opponentKey).on("value",
            function (snapshot) {
                if (snapshot.val() == null) { // opponent player is deleted
                    self.removeOpponent();
                    self.goToState2WaitForOpponent();
                }
            });
    };

    RPSGame.prototype.stopListeningForOpponentLeaving = function () {
        database.ref(this.playerPath).child(this.opponentKey).off();
    };


    // call this after we have created our user object in firebase so we can send out messages
    // regardless of whether we have an opponent
    RPSGame.prototype.setUpChatInputListener = function () {
        let self = this;
        // listen to the chat submit button
        this.chatSubmitButton.on("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            let message = self.chatInput.val().trim();
            self.chatInput.val("");  // get the message and reset to empty string
            if (message) {
                let pTag = $(`<p class="localChatMessage">${message}</p>`);
                self.chatElement.append(pTag);
                pTag[0].scrollIntoView(false);
                // send our message to our object 
                database.ref(self.playerPath).child(self.playerKey).update({ messageToSend: message });
            }
        });
    };
    RPSGame.prototype.turnChatInputListenerOff = function () {
        this.chatSubmitButton.off();
    };

    // this updates the div with messages to the user
    RPSGame.prototype.setGameMessage = function (message) {
        this.statusElement.text(message);
    };

    /*
    // show an image at the end of each match
    RPSGame.prototype.appendEndMatchImage = function (url) {
        this.statusElement.append(`
            <img src="${url}" class="resultImage"></img>
        `);
    };
    */


    // if the user closes the window/tab we need to clean up and 
    // delete ourselves from the firebase database
    RPSGame.prototype.listenForUnloadCleanUp = function () {
        let self = this;
        $(window).on("unload", function () {
            database.ref(self.playerPath).child(self.playerKey).remove();
            return "Handler for .unload() called.";
        });
    };

    // call this when we get an opponent and we can set some variables and 
    // create some listeners for chat messages and wins/losses
    RPSGame.prototype.setOpponent = function (key, name) {
        this.opponentKey = key;
        this.opponentName = name;
        this.remotePlayerNameElement.text(this.opponentName);
        this.listenForRemoteChatMessage();
        this.listenForRemotePlayerWinsLosses();
        this.chatForm.show();
        this.startListeningForOpponentLeaving();
        // if we were waiting for the opponent to make a move when they
        // quit, we get more than one click handler and that leads to a
        // very difficult bug to find.
        // subsequent attached players will cause more and more click handlers 
        // to be orphaned and will cause multiple events that fire.. messing up the score
        // SO I AM DOUBLE CHECKING THIS ISN'T STILL LISTENING
        this.localPlayerToolsElements.off();
    };
    RPSGame.prototype.removeOpponent = function (key, name) {
        this.remotePlayerNameElement.text("Player 2");
        this.stopListeningForRemoteChat();
        this.stopListeningForRemotePlayerWinsLosses();
        this.chatForm.hide();
        this.stopListeningForOpponentLeaving();
        this.opponentKey = "";
        this.opponentName = "";
        // if we were waiting for the opponent to make a move when they
        // quit, we get more than one click handler and that leads to a
        // very difficult bug to find.
        // subsequent attached players will cause more and more click handlers 
        // to be orphaned and will cause multiple events that fire.. messing up the score
        this.clearTimeOuts();
        this.localPlayerToolsElements.off();
        database.ref(this.playerPath).child(this.playerKey).update({
            opponentKey: "",
            opponentName: ""
        });
    };

    // create an even handler that listens for form submittal to get player name & creates object
    RPSGame.prototype.state1GetPlayerName = function () {
        console.log("entering state 1");
        this.setGameMessage("Please enter your name.");

        let self = this;
        form = this.nameForm;
        form.on("submit", function (event) {
            event.preventDefault();
            // validates the input from the user's name
            if (form[0].checkValidity() === false) {
                event.stopPropagation();
                form[0].classList.add('was-validated');
            }
            else { // form input is valid
                form.hide().off();

                self.playerName = self.playerNameInput.val().trim();
                self.playerNameElement.text(self.playerName);

                // make a key for yourself
                self.playerKey = database.ref(self.playerPath).push().key;
                // check if anyone is available to play and give them your key as your create 
                // your user object
                database.ref(self.playerPath).once('value').then(function (snapshot) {
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
                    database.ref(self.playerPath).child(self.playerKey).update({
                        key: self.playerKey,
                        name: self.playerName,
                        opponentKey: (self.opponentKey ? self.opponentKey : ""),
                        opponentName: (self.opponentName ? self.opponentName : ""),
                        wins: 0,
                        losses: 0,
                        playMade: "",
                        messageToSend: ""
                    });

                    // once our object has been created, we need to listen for closure/unload
                    // and delete ourselves from firebase and notify opponent we are gone
                    self.listenForUnloadCleanUp();

                    self.setUpChatInputListener();

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

    // you only go to this state if you are the "first" to arrive and need to wait for an opponent
    RPSGame.prototype.goToState2WaitForOpponent = function () {
        console.log("entering state 2");
        this.setGameMessage("Waiting for an opponent...");
        let self = this;
        database.ref(this.playerPath).child(this.playerKey).on("value",
            function (snapshot) {
                let sv = snapshot.val();
                if (sv.opponentKey != "") { // we have an opponent
                    // stop listening to ourselves, we will listen to the opponent
                    database.ref(self.playerPath).child(self.playerKey).off();
                    // update game session with this local player's name so remote gets it, set up listeners
                    self.setOpponent(sv.opponentKey, sv.opponentName);
                    self.goToState3RevealOpponent();
                }
            });
    };

    // print the opponent to the screen
    RPSGame.prototype.goToState3RevealOpponent = function () {
        console.log("entering state 3");
        this.setGameMessage("Your opponent is " + this.opponentName + ".");
        // wait a second and then tell them to make a move
        let self = this;
        this.step3Timeout = setTimeout(function () {
            self.goToState4MakeAMove();
        }, 2000);
    };

    // this will set up the RPS clickable images
    RPSGame.prototype.resetPlayMade = function () {
        this.playMade = "";
        this.localPlayerToolsElements.show();
    };

    // this will set up the RPS clickable images
    RPSGame.prototype.clickablePlayMade = function () {
        this.resetPlayMade();
        this.localPlayerToolsElements.addClass("clickable");
    };

    // hide the "tools" and then show the chosen one
    // send the choice to our object so the opponent can "hear" it
    RPSGame.prototype.setPlayMade = function (play) {
        this.playMade = play;
        this.localPlayerToolsElements.hide();
        this.localPlayerToolsElements.removeClass("clickable");
        $("#" + this.playMade).show();
        database.ref("players").child(this.playerKey).update({ playMade: this.playMade });
    };

    RPSGame.prototype.resetRemoteTools = function () {
        this.remotePlayerToolsElements.show();
    };
    RPSGame.prototype.setRemoteTools = function (play) {
        this.remotePlayerToolsElements.hide();
        $("#remote-" + play).show();
    };

    RPSGame.prototype.clearTimeOuts = function () {
        clearTimeout(this.step5Timeout);
        clearTimeout(this.step3Timeout);
        clearTimeout(this.step4_1Timeout);
        clearTimeout(this.step4_2Timeout);
        clearTimeout(this.step4_3Timeout);
        clearTimeout(this.step4_4Timeout);
    };

    // give a count down and listen for player's choice
    RPSGame.prototype.goToState4MakeAMove = function () {
        console.log("entering state 4");
        //this.setGameMessage("Get Ready!");
        this.resetPlayMade();
        this.resetRemoteTools();

        let self = this;
        let timeToWait = 1000;
        self.step4_1Timeout = setTimeout(function () {
            self.setGameMessage("ROCK!");
            self.step4_2Timeout = setTimeout(function () {
                self.setGameMessage("PAPER!");
                self.step4_3Timeout = setTimeout(function () {
                    self.setGameMessage("SCISSORS!");
                    self.step4_4Timeout = setTimeout(function () {
                        self.setGameMessage("Shoot!");
                        self.clickablePlayMade();

                        self.localPlayerToolsElements.on("click", function () {
                            self.localPlayerToolsElements.off()
                            self.setPlayMade($(this).attr("id"));
                            self.goToState5WaitForRemotePlayer();
                        });

                    }, timeToWait);
                }, timeToWait);
            }, timeToWait);
        }, timeToWait);
    };



    RPSGame.prototype.incrementWins = function () {
        this.wins++;
        this.localPlayerWinsElement.text(this.wins);
        database.ref(this.playerPath).child(this.playerKey).update({ wins: this.wins });
    };

    RPSGame.prototype.incrementLosses = function () {
        this.losses++;
        this.localPlayerLossesElement.text(this.losses);
        database.ref(this.playerPath).child(this.playerKey).update({ losses: this.losses });
    };

    // we have made our play, now we wait and listen for whatever the opponent does
    RPSGame.prototype.goToState5WaitForRemotePlayer = function () {
        console.log("entering state 5");
        this.setGameMessage("Waiting for opponent...");

        let self = this;
        database.ref(this.playerPath).child(this.opponentKey).child("playMade").on('value',
            function (snapshot) {
                let remotePlay = snapshot.val();

                if (remotePlay) {
                    database.ref(self.playerPath).child(self.opponentKey).child("playMade").off();
                    // acknowledge receipt of move by resetting it
                    database.ref(self.playerPath).child(self.opponentKey).update({ playMade: "" });
                    self.setRemoteTools(remotePlay);
                    if (self.playMade == remotePlay) {
                        self.setGameMessage(`${self.opponentName} played ${remotePlay}, TIE!`);
                        //self.appendEndMatchImage(tieGIFS.randomURL());
                    }
                    else if (self.playMade == "rock" && remotePlay == "scissors" ||
                        self.playMade == "paper" && remotePlay == "rock" ||
                        self.playMade == "scissors" && remotePlay == "paper") {
                        self.setGameMessage(`${self.opponentName} played ${remotePlay}. You WIN!`);
                        //self.appendEndMatchImage(winGIFS.randomURL());
                        self.incrementWins();
                    }
                    else {
                        self.setGameMessage(`${self.opponentName} played ${remotePlay}. You LOSE!`);
                        //self.appendEndMatchImage(lossGIFS.randomURL());
                        self.incrementLosses();
                    }
                    self.step5Timeout = setTimeout(function () {
                        self.goToState4MakeAMove();
                    }, 2000);
                }
            });
    };



    let game = new RPSGame();
    game.state1GetPlayerName();

});