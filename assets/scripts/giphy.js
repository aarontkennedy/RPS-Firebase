    function GIGCollection(intendedMessage) {
        this.gifs = ["assets/images/playAgain.png"];
        this.searchTerm = encodeURIComponent(this.intendedMessage);
        this.myKey = "MSfEV1eyHtNS3mXorDXyqTQ7JB6jY8Pi";
        this.requestedGIFS = 15;
        this.offset = 0;
        this.queryURL = `https://api.giphy.com/v1/gifs/search?q=${this.searchTerm}&api_key=${this.myKey}&limit=${this.requestedGIFS}&offset=${this.offset}`;

        let self = this;
        $.ajax({
            url: this.queryURL,
            method: "GET"
        }).then(function (response) {
            console.log("success got data from giphy", response.data);
            for (let i = 0; i < response.data.length; i++) {
                self.gifs.push(response.data[i].images["original"].url);
            }

            // fortunately GIPHY fails nicely if you request more pictures
            // than are available, it returns an empty data array
            // and doesn't cause my code to crash.
        });
    }

    GIGCollection.prototype.randomURL = function () {
        return this.gifs[Math.floor(Math.random()*this.gifs.length)];
    };

    let winGIFS = new GIGCollection("win");
    let lossGIFS = new GIGCollection("lose");
    let tieGIFS = new GIGCollection("tie");
