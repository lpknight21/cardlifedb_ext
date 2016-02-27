(function() {
    var cardlifeApp = angular.module('cardlifeApp', ['ui.bootstrap','checklist-model']);

    cardlifeApp.controller('PageController', function() {
        var tm = this;
         tm.tab=1;
        tm.setTab = function(newValue){
            this.tab = newValue;
        };
        tm.isSet = function(tabName){
            return this.tab === tabName;
        };
    });

    cardlifeApp.controller('CardsController', function ($http) {
        var vm = this;

        vm.cards = [];
        vm.lcgsets = [];
        vm.imageURL = "http://www.cardgamedb.com/forums/uploads/lotr/";
        vm.cardTypeSearch = "hero";
        vm.sortBySearch = "faction";
        vm.sphereType = "tactics";
        vm.lcgsetType = "";
        vm.cardModalPopoverTemplate = 'cardModalPopoverTemplate.html';
        vm.cardSize = "small";
    
        $http.get('data/lotr_cards.json').success(function(data) {
            vm.cards = data;
        });

        $http.get('data/lotr_sets.json').success(function(data) {
            vm.lcgsets = data;
        });

        vm.isCardType = function(type, cardType) {
            return type === cardType;
        };

        vm.getFactionIcon = function(sphere) {
            if(sphere === 'leadership') {
                return 'icon-leadership';
            } else if(sphere === 'lore') {
                return 'icon-lore';
            } else if(sphere === 'spirit') {
                return 'icon-spirit';
            } else if(sphere === 'tactics') {
                return 'icon-tactics';
            } else if(sphere === 'fellowship') {
                return 'icon-fellowship';
            } else if(sphere === 'baggins') {
                return 'icon-baggins';
            }
        };

        vm.setCardImageSize = function(imageSize) {
            vm.cardSize = imageSize;
        };

        vm.getCardImageType = function(cardType) {
            if(cardType === 'side quest') {
                if(vm.cardSize === 'medium') {
                    return 'side-quest-tab-image-src-md';
                } else if(vm.cardSize === 'large') {
                    return 'side-quest-tab-image-src-lg';
                } else {
                    return 'side-quest-tab-image-src';
                }
            } else {
                if(vm.cardSize === 'medium') {
                    return 'card-tab-image-src-md';    
                } else if(vm.cardSize === 'large') {
                    return 'card-tab-image-src-lg'; 
                } else {
                    return 'card-tab-image-src';
                }   
            }
        };

        vm.getCardImageTabType = function(cardType) {
            if(cardType === 'side quest') {
                if(vm.cardSize === 'medium') {
                    return 'side-quest-tab-image-md';
                } else if(vm.cardSize === 'large') {
                    return 'side-quest-tab-image-lg';
                } else {
                    return 'side-quest-tab-image';
                }
            } else {
                if(vm.cardSize === 'medium') {
                    return 'card-tab-image-md';    
                } else if(vm.cardSize === 'large') {
                    return 'card-tab-image-lg'; 
                } else {
                    return 'card-tab-image';
                }  
            }
        };
    });

    cardlifeApp.controller('DeckController', function ($http, $scope) {
        var dm = this;
        dm.firebaseServer = 'https://vivid-torch-696.firebaseio.com/cardlifedb';
        dm.cardlifedbChild = "cardlifedb";
        dm.firebase = new Firebase(dm.firebaseServer);
        dm.deckList = [];
        dm.currentDeck = {
            name: "Deck Name!",
            cards: [],
            description: "",
            modifiedDate: "",
            key: null
        };
        dm.currentDeckStats = {
                totalCards: 0,
                startingThreat: 0,
                totalSphere: {
                    leadership: 0,
                    spirit: 0,
                    lore: 0,
                    tactics: 0,
                    neutral: 0,
                    baggins: 0,
                    fellowship: 0
                },
                totalType: {
                    heroes: 0,
                    allies: 0,
                    events: 0,
                    attachments: 0,
                    sideQuests: 0
                }
            };;
        dm.filterCurrentDeck = false;
        dm.deckBBCodeShare = false;

        dm.lcgSets = [];
        dm.lcgFilterSets = [];
        dm.cardFactionList = ['leadership','tactics','spirit','lore','neutral'];
        dm.cardTypeList = ['hero'];
        dm.imageURL = "http://www.cardgamedb.com/forums/uploads/lotr/";

        $http.get('data/lotr_sets.json').success(function(data) {
            dm.lcgSets = data;
            for(var i=0; i < dm.lcgSets.length; i++) {
                dm.lcgFilterSets.push(dm.lcgSets[i].name);
            }
        });

        dm.isLoggedIn = function() {
            if(dm.firebase.getAuth()) {
                return true;
            }
            return false;
        }

        dm.logIn = function(userEmail, userPassword) {
            var userObj = {
                email: userEmail,
                password: userPassword
            };
            dm.loginUser(userObj, false);
        }

        dm.registerAndLogIn = function(userEmail, userPassword, userField) {
            if(userField == null) {
                var userObj = {
                    email: userEmail,
                    password: userPassword
                };
                dm.createUser(userObj);
            }
        }

        dm.createUser = function(userObj) {
            dm.firebase.createUser(userObj, function(error, userData) {
                if(error) {
                    alert(error + "\n Please return to the profile page to attemp to register again.");
                } else {
                    dm.loginUser(userObj, true);
                }
            });
        }

        dm.loginUser = function(userObj, newUser) {
            dm.firebase.authWithPassword(userObj, function(error, authData) {
                if(error) {
                    dm.loggedIn = false;
                    alert(error + "\n Please return to the profile page to attemp to login again.");
                } else {
                    dm.user = dm.firebase.getAuth();
                    dm.userEmail = userObj.email;
                    dm.loggedIn = true;
                    if(newUser) {
                        var deckList = [];
                        dm.firebase.child(dm.user.uid).set({
                            'lotrDecks': LZString.compressToUTF16(JSON.stringify(deckList))
                        });
                        dm.getUserData();
                    } else {
                        dm.getUserData();
                    }
                    $scope.$apply();
                }
            });
        }

        dm.getUserData = function() {
            dm.user = dm.firebase.getAuth();
            var userNode = new Firebase(dm.firebaseServer + "/" + dm.user.uid);
            userNode.once("value", function(snapshot, prevChildKey) {
                var decks = JSON.parse(LZString.decompressFromUTF16(snapshot.val().lotrDecks));
                for(var i=0; i < decks.length; i++) {
                    var deck = {
                        name: decks[i].name,
                        cards: decks[i].cards,
                        description: decks[i].description,
                        modifiedDate: decks[i].modifiedDate,
                        key: decks[i].key
                    }
                    dm.deckList.push(deck);
                }
                dm.currentDeck = {
                    name: dm.deckList[0].name,
                    cards: dm.deckList[0].cards,
                    description: dm.deckList[0].description,
                    modifiedDate: dm.deckList[0].modifiedDate,
                    key: dm.deckList[0].key
                };
                dm.loadDeckStats();
                $scope.$apply();
            });
        }

        dm.saveUserData = function() {
            if(dm.firebase.getAuth()) {
                var usersRef = dm.firebase.child(dm.user.uid);
                usersRef.child('lotrDecks').set(LZString.compressToUTF16(JSON.stringify(dm.deckList)));
            } else {
                dm.loggedIn = false;
                dm.deckList = [];
                alert("Your session has expired. Please go to the profile page to login again. Once you have logged in successfully please re-attempt this action.");
            }
        }

        dm.updateEmail = function(currentEmail, updatedEmail, userPassword) {
            var userObj = {
                oldEmail: currentEmail,
                newEmail: updatedEmail,
                password: userPassword
            };
            dm.firebase.changeEmail(userObj, function(error) {
                if(error === null) {
                    dm.user = dm.firebase.getAuth();
                    dm.updatedEmail = "";
                    dm.userEmail = userObj.newEmail;
                    dm.emailPassword = "";
                    $scope.$apply();
                    alert("Email changed successfully.");
                } else {
                    alert("Error changing email: " + error);
                }
            });
        }

        dm.updatePassword = function(email, currentPassword, updatedPassword) {
            var userObj = {
                email: dm.userEmail,
                oldPassword: currentPassword,
                newPassword: updatedPassword
            };
            dm.firebase.changePassword(userObj, function(error) {
                if(error === null) {
                    dm.user = dm.firebase.getAuth();
                    dm.newPassword = "";
                    dm.currentPassword = "";
                    $scope.$apply();
                    alert("Password changed successfully.");
                } else {
                    alert("Error changing password: " + error);
                }
            });
        }

        dm.forgotPassword = function(userEmail) {
            var userObj = {
                email: userEmail
            };
            dm.firebase.resetPassword(userObj, function(error) {
                if (error === null) {
                    deckController.forgotPassword = false;
                    $scope.$apply();
                    alert("Password reset email sent successfully.");
                } else {
                    alert("Error sending password reset email: " + error);
                }
            });
        }

        dm.logout = function() {
            dm.firebase.unauth();
            dm.user = dm.firebase.getAuth();
            dm.loggedIn = dm.isLoggedIn();
            dm.deckList = [];
            dm.userEmail = "";
        }

        dm.removeAccount = function(userEmail, userPassword) {
            var userObj = {
                email: userEmail,
                password: userPassword
            };
            if(confirm("Are you sure want to delete this deck?")) {
                var tempFirebase = new Firebase(dm.firebaseServer + "/" + dm.user.uid);
                tempFirebase.remove();
                dm.firebase.removeUser(userObj, function(error) {
                    if (error === null) {
                        dm.user = "";
                        dm.userEmail = "";
                        dm.deckList = [];
                        dm.loggedIn = dm.isLoggedIn();
                        dm.currentPassword = "";
                        $scope.$apply();
                        alert("Account removed successfully.");
                    } else {
                        alert("Error removing account: " + error);
                    }
                });
            }
        }

        dm.syncLocalDecks = function() {
            chrome.storage.local.get(null, function(data) {
                try {
                    var localDecks = JSON.parse(data.lotrDecks);
                    for(var i=0; i < localDecks.length; i++) {
                        var copiedDeck =  {
                            name: localDecks[i].name,
                            cards: [],
                            description: localDecks[i].description,
                            modifiedDate: localDecks[i].modifiedDate,
                            key: dm.deckList.length+1
                        };
                        for(var j=0; j < localDecks[i].cards.length; j++) {
                            copiedDeck.cards.push(localDecks[i].cards[j]);
                        }
                        dm.deckList.push(copiedDeck);
                    }
                    dm.saveUserData();
                    alert("Decks have been added to yoru deck list.");
                } catch(e) {
                    alert("No Local Decks Saved.");
                }
            }); 
        }

        dm.loggedIn = dm.isLoggedIn();
        if(dm.loggedIn) {
            dm.user = dm.firebase.getAuth();
            dm.getUserData();
            dm.userEmail = dm.firebase.getAuth().password.email;
        }

        dm.toggleDeckBBCodeShare = function() {
            dm.deckBBCodeShare = !dm.deckBBCodeShare;
        }

        dm.exportOCTGNFile = function() {
            var fileName = dm.currentDeck.name + ".o8d";
            var fileText = dm.getDeckOCTGNCode();
            dm.exportFile(fileName, fileText);
        }

        dm.exportTextFile = function() {
            var fileName = dm.currentDeck.name + ".txt";
            var fileText = dm.getDeckTextCode();
            dm.exportFile(fileName, fileText);
        }

        dm.exportFile = function(fileName, fileText) {
            var pom = document.createElement('a');
            pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileText));
            pom.setAttribute('download', fileName);

            pom.style.display = 'none';
            document.body.appendChild(pom);

            pom.click();

            document.body.removeChild(pom);
        }
        
        dm.loadDeck = function(deck) {
            dm.currentDeck = null;
            dm.currentDeck = {
                name: deck.name,
                cards: deck.cards,
                description: deck.description,
                modifiedDate: deck.modifiedDate,
                key: deck.key
            };
            dm.loadDeckStats();
        }

        dm.uploadDeck = function(event) {
            console.log("file: " + fileUpload);
            var file = event.target.files[0];
            if (file.name.indexOf(".o8d")>=0) {
                return this.uploadOctgn(file);
            }
            var deckname = file.name.replace('.txt','');
            var deck = this.currentdeck;
            if (file) {
                var r = new FileReader();
                    r.onload = function(e) { 
                    var contents = e.target.result.replace(/(\r\n|\n|\r)/gm,""); //strip newlines
                    var encoded = contents.match(/\+{80}([A-Za-z0-9+\-\r\n]+)\+{80}/gm)[0];
                    encoded = encoded.replace(/\+{80}/,"");
                    var decoded = JSON.parse(LZString.decompressFromEncodedURIComponent(encoded));
                    deck.load(decoded,cardObject);
                    $scope.$apply();
                };
                r.readAsText(file);
            };
        };

        dm.countCardsPerSphere = function(sphere) {
            var count = 0;
            for(var i=0; i < dm.currentDeck.cards.length; i++) {
                if((dm.currentDeck.cards[i].faction === sphere || sphere === 'all')
                     && dm.currentDeck.cards[i].type != 'hero') {
                    count = count + dm.currentDeck.cards[i].quantity;
                }
            }
            return count;
        }

        dm.getHeroes = function(deck) {
            var heroList = "";
            for(var i=0; i < deck.cards.length; i++) {
                if(deck.cards[i].type === 'hero') {
                    heroList = heroList + deck.cards[i].name + ', ';
                }
            }
            heroList = heroList.substring(0, heroList.length-2);
            return heroList;
        };

        dm.newDeck = function() {
            if(dm.deckList.length === 200) {
                alert("You have reached your deck total max. Please remove a deck if you want to create a new one.");
            } else {
                dm.currentDeck = null;
                dm.currentDeck = {
                    name: "Deck Name!",
                    cards: [],
                    description: "",
                    modifiedDate: "",
                    key: null
                };
                dm.loadDeckStats();
            }
        }

        dm.duplicateDeck = function() {
            if(dm.deckList.length === 200) {
                alert("You have reached your deck total max. Please remove a deck if you want to create a new one.");
            } else {
                var cloneDeck =  {
                    name: dm.currentDeck.name + " (copy)",
                    cards: [],
                    description: dm.currentDeck.description,
                    modifiedDate: "",
                    key: null
                    };
                for(var i=0; i < dm.currentDeck.cards.length; i++) {
                    cloneDeck.cards.push(dm.currentDeck.cards[i]);
                }
                dm.currentDeck = null;
                dm.currentDeck = cloneDeck;
            }
        }

        dm.loadDeckStats = function() {
            dm.currentDeckStats = null;
            dm.currentDeckStats = {
                totalCards: dm.countCardsPerSphere('all'),
                startingThreat: dm.getStartingThreat(),
                totalSphere: {
                    leadership: dm.countCardsPerSphere('leadership'),
                    spirit: dm.countCardsPerSphere('spirit'),
                    lore: dm.countCardsPerSphere('lore'),
                    tactics: dm.countCardsPerSphere('tactics'),
                    neutral: dm.countCardsPerSphere('neutral'),
                    baggins: dm.countCardsPerSphere('baggins'),
                    fellowship: dm.countCardsPerSphere('fellowship')
                },
                totalType: {
                    heroes: dm.getCardTypeCount('hero'),
                    allies: dm.getCardTypeCount('ally'),
                    events: dm.getCardTypeCount('event'),
                    attachments: dm.getCardTypeCount('attachment'),
                    sideQuests: dm.getCardTypeCount('side quest')
                }
            };
        }

        dm.updateDeck = function(card, quantity) {
            for (var i=0; i < dm.currentDeck.cards.length; i++) {
                if(dm.currentDeck.cards[i].setInfo.setId === card.setInfo.setId) {
                    if(dm.currentDeck.cards[i].setInfo.name == card.setInfo.name) {
                        dm.currentDeck.cards.splice(i, 1);
                    }
                }
            };      
            if(quantity > '0' && card.type === 'hero') {
                var heroCount = 0;
                for (var i=0; i < dm.currentDeck.cards.length; i++) {
                    if(dm.currentDeck.cards[i].type === 'hero') {
                        heroCount++;
                    }
                };
                if(heroCount < 3) {
                    card.quantity = quantity;
                    dm.currentDeck.cards.push(card);
                } else {
                    alert("Can't have more than 3 heroes in a deck.");
                };
            } else if(quantity > '0') {
                card.quantity = quantity;
                dm.currentDeck.cards.push(card);
            };
            dm.loadDeckStats();
        };

        dm.saveDeck = function() {
            dm.currentDeck.modifiedDate = dm.getDateTime();
            if(dm.currentDeck.key === null) {
                dm.currentDeck.key = dm.deckList.length+1;
                dm.deckList.push(dm.currentDeck);
            } else {
                dm.deckList[dm.currentDeck.key-1] = dm.currentDeck;
            }
            dm.saveUserData();
        };

        dm.removeDeck = function() {
            if(confirm("Are you sure want to delete this deck?")) {
                for(var i=0; i < dm.deckList.length; i++) {
                    var currentKey = dm.deckList[i].key;
                    if(currentKey > dm.currentDeck.key) {
                        dm.deckList[i].key = currentKey-1;
                    }
                };
                dm.deckList.splice(dm.currentDeck.key-1, 1);
                var key = 0;
                if(dm.deckList.length <= dm.currentDeck.key-1) {
                    key = dm.deckList.length-1;
                } else {
                   key = dm.currentDeck.key-1;
                }
                dm.currentDeck = {
                        name: dm.deckList[key].name,
                        cards: dm.deckList[key].cards,
                        description: dm.deckList[key].description,
                        modifiedDate: dm.deckList[key].modifiedDate,
                        key: dm.deckList[key].key
                };
                dm.saveUserData();
            };
        };

        dm.getDateTime = function() {
            var date = new Date();
            var localTime = date.toLocaleTimeString('en-US');
            var localDate = date.toLocaleDateString('en-US');
            return localDate + ' ' + localTime;
        };

        dm.getCardsByType = function(cardType) {
            var cardsForType = [];
            for(var i=0; i < dm.currentDeck.cards.length; i++) {
                if(dm.currentDeck.cards[i].type === cardType) {
                    cardsForType.push(dm.currentDeck.cards[i]);
                }
            }
            return cardsForType;
        };

        dm.getCardTypeCount = function(cardType) {
            var cardCount = 0;
            for(var i=0; i < dm.currentDeck.cards.length; i++) {
                if(dm.currentDeck.cards[i].type === cardType) {
                    cardCount = cardCount + dm.currentDeck.cards[i].quantity;
                }
            }
            return cardCount;
        };

        dm.getQuantity = function(card) {
            for(var i=0; i < dm.currentDeck.cards.length; i++) {
                if(dm.currentDeck.cards[i].setInfo.setId === card.setInfo.setId) {
                    if(dm.currentDeck.cards[i].setInfo.name == card.setInfo.name) {
                        return dm.currentDeck.cards[i].quantity;
                    }
                };
            };
            return 0;
        };

        dm.getStartingThreat = function() {
            var startingThreat = 0;
            var heroes = dm.getCardsByType('hero');
            for(var i=0; i < heroes.length; i++) {
                startingThreat = startingThreat + parseInt(heroes[i].details.threatCost);
            }
            return startingThreat;
        }

        dm.addCardFilter = function(category, list) {
            if(list === 'sphere') {
                if(dm.cardFactionList.indexOf(category) > -1) {
                    for(var i=0; i < dm.cardFactionList.length; i++) {
                        if(dm.cardFactionList[i] === category) {
                            dm.cardFactionList.splice(i, 1);
                            break;
                        } 
                    }
                } else {
                    dm.cardFactionList.push(category);
                }
            } else {
                if(dm.cardTypeList.indexOf(category) > -1) {
                    found = true;
                    for(var i=0; i < dm.cardTypeList.length; i++) {
                        if(dm.cardTypeList[i] === category) {
                            dm.cardTypeList.splice(i, 1);
                            break;
                        } 
                    }
                } else {
                    dm.cardTypeList.push(category);
                }
            }
        };

        dm.setLCGSet = function(set, checked) {
            if(checked) {
                dm.lcgSets.push(set);
            } else {
                var index = dm.lcgSets.indexOf(set);
                if(index > 0) {
                    dm.lcgSets.splice(index, 1);
                }
            }
        }

        dm.toggleFilterCurrentDeck = function() {
            dm.filterCurrentDeck = !dm.filterCurrentDeck;
        }

        dm.getDeckBBCodeShare = function() {
            var bggCode = "[b]" + dm.currentDeck.name + "[/b]\n\n";
            bggCode = bggCode + dm.getDeckBbCodeCardType('hero', 'Heroes');
            bggCode = bggCode + "\n";
            bggCode = bggCode + dm.getDeckBbCodeCardType('ally', 'Allies');
            bggCode = bggCode + "\n";
            bggCode = bggCode + dm.getDeckBbCodeCardType('attachment', 'Attachments');
            bggCode = bggCode + "\n";
            bggCode = bggCode + dm.getDeckBbCodeCardType('event', 'Events');
            bggCode = bggCode + "\n";
            bggCode = bggCode + dm.getDeckBbCodeCardType('side quest', 'Side Quests');
            bggCode = bggCode + "\n";
            var totalCards = dm.currentDeckStats.totalCards;
            bggCode = bggCode + totalCards + " Cards";
            return bggCode;
        };

        dm.getDeckBbCodeCardType = function(cardType, title) {
            var cardTypeText = "";
            var cardsByType = dm.getCardsByType(cardType);
            cardTypeText = cardTypeText + "[b]" + title + " (" + dm.getCardTypeCount(cardType) + ")[/b]\n";
            for(var i=0; i < cardsByType.length; i++) {
                var card = cardsByType[i];
                cardTypeText = cardTypeText + card.quantity + "x " + "[url=" + dm.imageURL + card.image + "]";
                cardTypeText = cardTypeText +  card.name + "[/url] [i]" +  "(" + card.setInfo.name + ")[/i]\n";
            }
            return cardTypeText;
        };

        dm.getDeckOCTGNCode = function() {
            var octgnCode = "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?>\n";
            octgnCode = octgnCode + "<deck game=\"a21af4e8-be4b-4cda-a6b6-534f9717391f\">\n";
            octgnCode = octgnCode + dm.getDeckOCTGNCardType('hero', 'Hero');
            octgnCode = octgnCode + dm.getDeckOCTGNCardType('ally', 'Ally');
            octgnCode = octgnCode + dm.getDeckOCTGNCardType('event', 'Event');
            octgnCode = octgnCode + dm.getDeckOCTGNCardType('attachment', 'Attachment');
            octgnCode = octgnCode + dm.getDeckOCTGNCardType('side quest', 'Side Quest');
            octgnCode = octgnCode + "<notes><![CDATA[]]></notes></deck>";
            return octgnCode;
        };

        dm.getDeckOCTGNCardType = function(cardType, title) {
            var cardTypeText = "<section name=\"" + title + "\" shared=\"False\">\n";
            var cardsByType = dm.getCardsByType(cardType);
            for(var i=0; i < cardsByType.length; i++) {
                var card = cardsByType[i];
                if(card.octgnId === "" ) {
                    cardTypeText = "<!--This file will not load into OCTGN becuase there is no id for " + card.name + " -->\n" + cardTypeText;
                }
                cardTypeText = cardTypeText + "<card qty=\"" + card.quantity + "\" id=\"" + card.octgnId + "\">" + card.name + "</card>\n";
            }
            cardTypeText = cardTypeText + "</section>\n";
            return cardTypeText;
        }

        dm.getDeckTextCode = function() {
            var textCode = "Total Cards: (" + dm.currentDeckStats.totalCards + ")\n\n";
            textCode = textCode + dm.getDeckTextCardType('hero', 'Hero');
            textCode = textCode + dm.getDeckTextCardType('ally', 'Ally');
            textCode = textCode + dm.getDeckTextCardType('event', 'Event');
            textCode = textCode + dm.getDeckTextCardType('attachment', 'Attachment');
            textCode = textCode + dm.getDeckTextCardType('side quest', 'Side Quest');
            textCode = textCode + "Description: \n" + dm.currentDeck.description;
            return textCode;
        };

        dm.getDeckTextCardType = function(cardType, title) {
            var cardsByType = dm.getCardsByType(cardType);
            var cardTypeText = title + ": (" + dm.getCardTypeCount(cardType) + ")\n\n";
            for(var i=0; i < cardsByType.length; i++) {
                var card = cardsByType[i];
                cardTypeText = cardTypeText + card.quantity + "x " + card.name + " (" + card.setInfo.name + ")\n";
            }
            cardTypeText = cardTypeText + "\n";
            return cardTypeText;
        }
    });

    cardlifeApp.filter('lotrCardFilter', function() {
        return function (input, sphere, cardType, lcgset) {
            var cards = [];
            for (var i = 0; i < input.length; i++) {
                //filter by sphere
                if (sphere === "" || input[i].faction === sphere) {
                    //filter by card type
                    if (cardType === "" || input[i].type === cardType) {
                        //filter by lcgset
                        if (lcgset === "" || input[i].setInfo.name === lcgset || input[i].setInfo.cycleName === lcgset) {
                            cards.push(input[i]);
                        }
                    }
                }
            }
            return cards;
        };
    });

    cardlifeApp.filter('deckCardFilter', function() {
        return function (input, sphereList, typeList, lcgsets, deck, filterCurrentDeck) {
            var cards = [];
            for(var i=0; i < input.length; i++) {
                if(filterCurrentDeck) {
                    for(var j=0; j < deck.cards.length; j++) {
                        if(deck.cards[j].setInfo.name === input[i].setInfo.name) {
                            if (deck.cards[j].setInfo.setId === input[i].setInfo.setId) {
                                cards.push(input[i]);
                            }
                        }
                    }
                } else {
                if(lcgsets.indexOf(input[i].setInfo.name) > -1 
                        || lcgsets.indexOf(input[i].setInfo.cycleName) > -1) {
                    if(sphereList.indexOf(input[i].faction) > -1 || sphereList.length < 1) {
                        if(typeList.indexOf(input[i].type) > -1 || typeList.length < 1) {
                            cards.push(input[i]);
                        }
                    }
                }
            }
            }
            return cards;
        };
    });

    cardlifeApp.filter('titleCase', function() {
       return function(input) {
           input = input || '';
           return input.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
       }
    });

    cardlifeApp.filter('stringifyArray', function() {
        return function(input) {
            return input.join(', ');
        }
    });
})();