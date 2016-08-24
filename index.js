const express = require('express');
	bodyParser = require('body-parser'),
	pogobuf = require('pogobuf'),
	POGOProtos = require('node-pogo-protos'),
	fs = require('fs'),
	cookieParser = require('cookie-parser'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	session = require('express-session'),
	bcrypt = require('bcryptjs'),
	deepEqual = require('deep-equal');

var userData = require('./userData.json')
var teamData = require('./teamData.json')
var battleBox = require('./battleBox.json')
var app = express();

// middleware stuff

app.use(bodyParser.json());
app.use(session({ secret: 'ZTgqt3mHtPtfzTxN' }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('static'));

app.set('view engine', 'pug');

function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the login page
    res.redirect('/login');
}

function pruneMonData(pokeList) {
	var prunedList = [];
	pokeList.forEach(function(pokemon){
		prunedList.push({
			id: pokemon.id++,
			nickname: pokemon.nickname,
			aIV: pokemon.aIV++,
			dIV: pokemon.dIV++,
			sIV: pokemon.sIV++,
			move1: pokemon.move1++,
			move2: pokemon.move2++
		})
	})
	return prunedList;
}

function verifyMons(user,team) {
	var orgMons = pruneMonData(teamData[user]);
	var result = true;
	team.forEach(function(pokemon) {
		var p = false;
		for (var i = orgMons.length - 1; i >= 0 && !p; i--) {
			p = deepEqual(orgMons[i],pokemon);
		};
		result = result && p;
	})
	return result;
}

// passport methods

passport.use(new LocalStrategy(function(username, password, done){
    username = username ? username.toLowerCase() : '';
	var pHash = userData[username] || "hello world!"
	bcrypt.compare(password, pHash, function(err, res){
		if (res && userData[username]) {
			return done(null, username)
		} else {
			return done(null, false, {message: "Incorrect user name or password."})
		}
	})
}))

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// login methods for Google and PTC

app.post('/googleImport', isLoggedIn, bodyParser.urlencoded({
		extended: true
	}),function(req,res){
	var login = new pogobuf.GoogleLogin();
	var client = new pogobuf.Client();
	login.login(req.body.name, req.body.pass)
    .then(token => {
        // Initialize the client
        client.setAuthInfo('google', token);

        // Perform the initial request
        return client.init();
    })
    .then(() => {
        // Get full inventory
        return client.getInventory(0);
    })
    .then(inventory => {
        if (!inventory.success) throw Error('success=false in inventory response');

        var pokeArr = []

        inventory = pogobuf.Utils.splitInventory(inventory);
        inventory.pokemon.forEach(function(pokemon){
            var tCP = pokemon.cp_multiplier+pokemon.additional_cp_multiplier;
            var pokeObj = {
                id: pokemon.pokemon_id,
                cp: pokemon.cp,
                nickname: pokemon.nickname,
                tcm: tCP*tCP,
                aIV: pokemon.individual_attack,
                dIV: pokemon.individual_defense,
                sIV: pokemon.individual_stamina,
                move1: pokemon.move_1,
                move2: pokemon.move_2
            }
            pokeArr.push(pokeObj);
        })
        teamData[req.user] = pokeArr
        fs.writeFile('./teamData.json', JSON.stringify(teamData));
        res.send(pokeArr)
    })
    .catch(console.error);
})

app.post('/ptcImport', isLoggedIn, bodyParser.urlencoded({
		extended: true
	}),function(req,res){
	var login = new pogobuf.PTCLogin();
	var client = new pogobuf.Client();
	login.login(req.body.name, req.body.pass)
    .then(token => {
        // Initialize the client
        client.setAuthInfo('ptc', token);

        // Perform the initial request
        return client.init();
    })
    .then(() => {
        // Get full inventory
        return client.getInventory(0);
    })
    .then(inventory => {
        if (!inventory.success) throw Error('success=false in inventory response');

        var pokeArr = []

        inventory = pogobuf.Utils.splitInventory(inventory);
        inventory.pokemon.forEach(function(pokemon){
            var tCP = pokemon.cp_multiplier+pokemon.additional_cp_multiplier;
            var pokeObj = {
                id: pokemon.pokemon_id,
                cp: pokemon.cp,
                nickname: pokemon.nickname,
                level: levelf(tCP),
                aIV: pokemon.individual_attack,
                dIV: pokemon.individual_defense,
                sIV: pokemon.individual_stamina,
                move1: pokemon.move_1,
                move2: pokemon.move_2
            }
            pokeArr.push(pokeObj);
        })
        teamData[req.user] = pokeArr;
        fs.writeFile('./teamData.json', JSON.stringify(teamData));
        res.send(pokeArr);
    })
    .catch(console.error);
})

app.post('/googletokenImport', isLoggedIn, bodyParser.urlencoded({
		extended: true
	}),function(req,res){
	var login = new pogobuf.GoogleLogin();
	var client = new pogobuf.Client();

	login.loginWithToken(req.body.name, req.body.pass)
    .then(token => {
        // Initialize the client
        client.setAuthInfo('google', token);

        // Perform the initial request
        return client.init();
    })
    .then(() => {
        // Get full inventory
        return client.getInventory(0);
    })
    .then(inventory => {
        if (!inventory.success) throw Error('success=false in inventory response');

        var pokeArr = [];

        inventory = pogobuf.Utils.splitInventory(inventory);
        inventory.pokemon.forEach(function(pokemon){
            var tCP = pokemon.cp_multiplier+pokemon.additional_cp_multiplier;
            var pokeObj = {
                id: pokemon.pokemon_id,
                cp: pokemon.cp,
                nickname: pokemon.nickname,
                tcm: tCP*tCP,
                aIV: pokemon.individual_attack,
                dIV: pokemon.individual_defense,
                sIV: pokemon.individual_stamina,
                move1: pokemon.move_1,
                move2: pokemon.move_2
            }
            pokeArr.push(pokeObj);
        });
        teamData[req.user] = pokeArr;
        fs.writeFile('./teamData.json', JSON.stringify(teamData));
        res.send(pokeArr);
    })
    .catch(console.error);
})

// server API

app.get('/', function(req,res){
	res.render('home',{user : req.user});
})

app.get('/teamBuilder', isLoggedIn, function(req,res){
	res.render('team',{user : req.user});
})

app.get('/register', function(req,res){
	res.render('register');
})

app.get('/register/success', function(req,res){
	res.render('regSuccess');
})

app.post('/register',bodyParser.urlencoded({
        extended: true
    }), function(req,res){
    var regName = req.body.email.toLowerCase()
	if (!userData[regName]) {
		bcrypt.genSalt(10, function(err, salt) {
		    bcrypt.hash(req.body.password, salt, function(err, hash) {
		        userData[regName] = hash;
		        fs.writeFile('./userData.json', JSON.stringify(userData));
		        res.redirect('/register/success');
		    });
		});
	} else {
		res.send('Already registered');
	}
})

app.get('/login', function(req,res) {
	res.render('login',{alerts:[]});
})

app.post('/login', bodyParser.urlencoded({
		extended: true
	}),	passport.authenticate('local'),
	function(req,res){
		res.redirect('/teamBuilder');
})

app.get('/logout', isLoggedIn, function(req,res){
	req.logout();
	res.redirect('/');
})

app.get('/pokemonData', isLoggedIn, function(req,res){
	res.send(teamData[req.user]);
})

app.post('/registerTeam', isLoggedIn, bodyParser.urlencoded({
		extended: true
	}), function(req,res) {
		var team = pruneMonData(req.body.pokemon);
		if (verifyMons(req.user,team)) {
			battleBox[req.user] = team;
			fs.writeFile('./battleBox.json', JSON.stringify(battleBox));
			res.send({result:true});
		} else {
			res.send({result:false});
		}
}) 

app.get('/profile', isLoggedIn, function(req,res) {
    res.render('profile', {user: req.user, pokemons: battleBox[req.user], pokemonNames: ['','Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle','Blastoise','Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto','Pidgeot','Rattata','Raticate','Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew','Sandslash','NidoranF','Nidorina','Nidoqueen','NidoranM','Nidorino','Nidoking','Clefairy','Clefable','Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat','Oddish','Gloom','Vileplume','Paras','Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck','Golduck','Mankey','Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam','Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude','Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton',"Farfetch'd",'Doduo','Dodrio','Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar','Onix','Drowzee','Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone','Marowak','Hitmonlee','Hitmonchan','Lickitung','Koffing','Weezing','Rhyhorn','Rhydon','Chansey','Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu','Starmie','Mr. Mime','Scyther','Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto','Eevee','Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl','Snorlax','Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew']})   
})

app.post('/gameLogin', bodyParser.urlencoded({
        extended: true
    }), passport.authenticate('local'),
    function(req,res) {
        res.send(battleBox[req.user]);
})

app.get('/createRoom', bodyParser.urlencoded({
        extended: true
    }), function(req,res) {
        if (rooms[req.room]) {
            res.send("0");
        } else {
            rooms[req.room] = [];
            res.send("1");
        }
})

app.listen(3000);

// Socket code
// for battle rooms

const net = require('net');

var rooms = {};
var socketBook = {};

// var clients = [];

const server = net.createServer(function(socket) {
    // console.log(socket);
    socket.name = socket.remoteAddress + ":" + socket.remotePort;
    socket.setNoDelay();
    console.log(socket.name + " connected")
    // clients.push(socket);

    socket.on('data', function (data) {
        if (data[0]==0x52) {
            socketBook[socket.name] = data.toString('utf8',2,data.length-2);
            if (rooms[data.toString('utf8',2,data.length-2)]) {
                rooms[data.toString('utf8',2,data.length-2)].push(socket);
                console.log(socket.name+" in room "+data.toString('utf8',2,data.length-2))
            } else {
                rooms[data.toString('utf8',2,data.length-2)] = [];
                rooms[data.toString('utf8',2,data.length-2)].push(socket);
                console.log(socket.name+" in room "+data.toString('utf8',2,data.length-2))
            }
        } else {
            broadcast(data, socket);
        }
    });

    socket.on('end', function () {
        console.log(socket.name+" disconnected")
        // clients.splice(clients.indexOf(socket), 1);
        rooms[socketBook[socket.name]] = undefined;
    });

    function broadcast(message, sender) {
        try {
            rooms[socketBook[sender.name]].forEach(function (client) {
                // Don't want to send it to sender
                if (client === sender) return;
                client.write(message);
            });
            // Log it to the server output too
            sender.write("y\r\n");
            console.log(message);
        } catch(error) {
            rooms[socketBook[sender.name]] = undefined;
            socket.write("E:404\r\n");
            console.log(error);
        }
    }


}).listen(3300);