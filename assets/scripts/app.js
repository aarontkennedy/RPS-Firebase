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
    let database = firebase.database().ref("gameSessions");

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
            goToState1(playerName);
        }
    });

    function goToState1(playerName) {
        // check if a game session has already been created
        // that we can join
        database.once('value').then(function (snapshot) {
            let sv = snapshot.val();
            let foundGameSession = false;
            //console.log(sv);
            for (var key in sv) {
                //console.log(key + " -> " + sv[key]);
                // claim the first availableGameSession
                if (!sv[key].claimed && sv[key].player1Name) {
                    foundGameSession = true;
                    database.child(key).set({
                        claimed: true,
                        player1Name: sv[key].player1Name,
                        player2Name: playerName,
                        player1Wins: 0,
                        player1Losses: 0,
                        player1Play: "",
                        player2Play: ""
                    });
                    break;
                }
            }
            if (!foundGameSession) {
                // create a new game session
                database.push({
                    claimed: false,
                    player1Name: playerName,
                    player2Name: "",
                    player1Wins: 0,
                    player1Losses: 0,
                    player1Play: "",
                    player2Play: ""
                });
            }
        });

    }

});