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
        let gameSessionKey = null;
        let amIPlayer1 = null;
    }
    let game = new RPSGame();

    RPSGame.prototype.goToState1GetAGameSession = function (playerName) {
        // check if a game session has already been created that we can join
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
                    database.ref(databaseGamePath).child(self.gameSessionKey).update({
                        claimed: true,
                        player2Name: playerName
                    });
                    $("#player2Name").text(sv[key].player1Name);
                    break;
                }
            }
            if (!foundGameSession) {
                // create a new game session
                
                self.amIPlayer1 = true;
                self.gameSessionKey = database.ref(databaseGamePath).push().key;
                database.ref(databaseGamePath).child(self.gameSessionKey).update({
                    key: self.gameSessionKey,
                    claimed: false,
                    player1Name: playerName,
                    player2Name: "",
                    player1Wins: 0,
                    player1Losses: 0,
                    player1Play: "",
                    player2Play: ""
                });
                game.goToState2WaitForNewOpponent();
            }
            else {
                self.amIPlayer1 = false;
                game.goToState3MakeAMove();
            }
        });
    };

    RPSGame.prototype.goToState2WaitForNewOpponent = function () {
        $("#gameResults").text("Waiting for an opponent to join...");

        let self = this;
        database.ref(databaseGamePath /*+ "/" + this.gameSessionKey*/).on("child_changed", function (snapshot) {
            
            let sv = snapshot.val();
            if (sv.key == self.gameSessionKey) {

                $("#player2Name").text(sv.player2Name);
                self.goToState3MakeAMove();
                database.ref(databaseGamePath).off();
            }
        });
    };

    RPSGame.prototype.goToState3MakeAMove = function () {

        let self = this;
        $("#gameResults").text("Choose Rock, Paper, Scissors!");
        $(".playerTools").on("click", "img", function () {
            $(".playerTools").off();
            $(".clickable").hide();
            $(this).show();

            console.log("You played " + $(this).attr("data-play"));

            let playMade = null;
            if (self.amIPlayer1) {
                playMade = {player1Play: $(this).attr("data-play")};
            }
            else {
                playMade = {player2Play: $(this).attr("data-play")};
            }
            database.ref(databaseGamePath).child(self.gameSessionKey).update(playMade);

            self.goToState4WaitForPlay();
        });
    };

    RPSGame.prototype.goToState4WaitForPlay = function () {
        $("#gameResults").text("Waiting for Your Opponent...");

        let self = this;
        let intervalID = setInterval(function(){ 
            database.ref(databaseGamePath +"/"+self.gameSessionKey).once('value').then(function(snapshot) {
                let sv = snapshot.val();

                if (sv.player1Play !="" && sv.player2Play !="" ) {
                    clearInterval(intervalID);
                    console.log(sv.player1Play +" vs "+sv.player2Play);

                    $(".player2 img").hide();
                    $("#p2"+sv.player2Play).show();

                    if (sv.player1Play == sv.player2Play) {
                        self.goToState5HandleResult("Tie");
                    }
                    else {
                        let didPlayer1Win = false;
                        if (sv.player1Play == "rock" && sv.player2Play == "scissors" || sv.player1Play == "paper" && sv.player2Play == "rock" ||sv.player1Play == "scissors" && sv.player2Play == "paper") {
                            didPlayer1Win = true;
                        }
                        if (self.amIPlayer1) {
                            self.goToState5HandleResult(didPlayer1Win ? "Win" : "Loss");
                        }
                        else {
                            self.goToState5HandleResult(didPlayer1Win ? "Loss" : "Win");}
                    }
                }
            });
         }, 250);
    };

    RPSGame.prototype.goToState5HandleResult = function (result) {
        $("#gameResults").text(result);

    };


    // create an even handler that listens for form submittal
    // and validates the input from the user's name
    let form = $("#nameSelection");
    form.on("submit", function (event) {

        event.preventDefault();
        if (form[0].checkValidity() === false) {
            event.stopPropagation();
            form[0].classList.add('was-validated');
        }
        else {
            form.hide();
            let playerName = $("#player1NameInput").val().trim();
            $("#player1Name").text(playerName);
            game.goToState1GetAGameSession(playerName);
        }
    });

});