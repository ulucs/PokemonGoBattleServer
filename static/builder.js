var pokemonData = [];
var noSelected = 0;
var selectedSpecies = [];
var selectedPokemon = [];

var saveTeam = function() {
    var alertMsg = ""
    waitingDialog.show();
    if (selectedPokemon.length && selectedPokemon.length<=6) {
        $.ajax({
        url: '/registerTeam',
        type: 'post',
        dataType: 'json',
        data: {pokemon:selectedPokemon},
        success: function(data){
            alertMsg = data.result ? "<div class='alert alert-success alert-dismissable'>"+
                    '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                      '<span aria-hidden="true">&times;</span>' +
                    '</button>' +
                    "Success! Now you can access your team by logging into the game."+
                "</div>" : "<div class='alert alert-danger alert-dismissable'>"+
                    '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                      '<span aria-hidden="true">&times;</span>' +
                    '</button>' +
                    "Verification error! Please make sure you're logged in and try again." +
                "</div>";
            $('#alertContainer').html(alertMsg);
            waitingDialog.hide();
        }, 
        error: function(jqXHR, exception) {
            alertMsg = "<div class='alert alert-warning alert-dismissable'>"+
                    '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                      '<span aria-hidden="true">&times;</span>' +
                    '</button>' +
                    "There was a problem with reaching the server. Please refresh and try again." +
                "</div>";
            $('#alertContainer').html(alertMsg);
            waitingDialog.hide();
        }
    })
    }
}

var selectMons = function() {
    selectedPokemon = [];
    pokemonData.forEach(function(pokemon){
        if (pokemon.selected) {
            selectedPokemon.push(pokemon);
        }
    })
    displayPokemon(selectedPokemon,false,'#selectedContainer');
    $('#pageTabs a[href="#review"]').tab('show');
}

var sortfuncs = {
    cp : (a,b) => - a.cp/a.tcm + b.cp/b.tcm,
    number : (a,b) => a.id - b.id
}

var selectPokemon = function(pokemon){
    if (pokemonData[pokemon]['selected']) {
        pokemonData[pokemon]['selected'] = false;
        $('#pokemon'+pokemon).removeClass('selected');
        selectedSpecies[pokemonData[pokemon]['id']] = 0;
        noSelected--
    } else if (noSelected > 5) {
        alert("You cannot select more than six!")
    } else if (selectedSpecies[pokemonData[pokemon]['id']]) {
        alert("You cannot pick the same species twice!")
    } else {
        pokemonData[pokemon]['selected'] = true;
        $('#pokemon'+pokemon).addClass('selected');
        noSelected++
        selectedSpecies[pokemonData[pokemon]['id']] = 1;
    }
}

var displayPokemon = function(pokelist,restriction,target){
    var rest = restriction || Array(pokelist.length).fill(1);
    $('#sortOptions').html("<div class='sortingOps'>"+
            "<button type='button' class='btn btn-default' disabled>Sort by:</button>"+
            '<button type="button" class="btn btn-success" onClick="sortPokemon(\'number\');">Pokemon #</button>'+
            '<button type="button" class="btn btn-success" onClick="sortPokemon(\'cp\');">Adj. CP</button>'+
            '<button type="button" class="btn btn-success" onClick="pruneMultiples();">CP (no dup)</button>'+
            '<button type="button" class="btn btn-primary pull-right" onClick="selectMons();">Confirm Selected</button>'+
        "</div>");
    var insideHTML = '';
    pokelist.forEach(function(pokemon,i){
        if (pokemon.id>0 && (rest[i] || pokemon.selected)){
            insideHTML = insideHTML + '<div class="col-md-2 col-sm-3 col-xs-4 pokemon-container-container">'+
                "<div class='col-xs-12 pokemon-container "+((pokemon.selected&&!target)?"selected":"")+"' onClick='selectPokemon("+i+")' id='pokemon"+i+"'>" +
                    "<h5>"+ (pokemon.nickname || pokemonNames[pokemon.id]) +"</h5>" +
                    "<img src='/imgs/"+pokemon.id+".png' /><br>" +
                    "<table>"+
                        "<tr>"+
                            "<td>Adj. CP:</td>"+
                            "<td>" +
                                Math.round(pokemon.cp / pokemon.tcm * 0.6) +
                            "</td>" +
                        "</tr>"+
                        "<tr>"+
                            "<td>Attack IV:</td>"+
                            "<td>"+pokemon.aIV+"</td>"+
                        "</tr>"+
                        "<tr>"+
                            "<td>Defense IV:</td>"+
                            "<td>"+pokemon.dIV+"</td>"+
                        "</tr>"+
                        "<tr>"+
                            "<td>Stamina IV:</td>"+
                            "<td>"+pokemon.sIV+"</td>"+
                        "</tr>"+
                    "</table>"+
                "</div></div>";
        }
    })
    var target = target || "#importedPokemon";
    $(target).html(insideHTML);
}

var sortPokemon = function(sorttype) {
    if (sorttype != 'number'){ pokemonData.sort(sortfuncs['number']) }
    pokemonData.sort(sortfuncs[sorttype]);
    displayPokemon(pokemonData);
}

var retrieveFromServer = function(){
    waitingDialog.show();
    $.ajax({
        url: '/pokemonData',
        type: 'get',
        success: function(data){
            if(data.length){
                pokemonData = data;
                displayPokemon(data);
            }
            waitingDialog.hide();
        }
    })
}

var pruneMultiples = function() {
    pokemonData.sort(sortfuncs['cp']);
    pokemonData.sort(sortfuncs['number']);
    pokemonData.sort(sortfuncs['cp']);
    var hasht = []
    var sameArr= [];
    pokemonData.forEach(function(pokemon,i){
        sameArr[i] = hasht[pokemon.id] ? 0 : 1;
        hasht[pokemon.id] = 1;
    })
    displayPokemon(pokemonData,sameArr);
}

$("#importedPokemon").ready(retrieveFromServer)

$(function() {
    //hang on event of form with id=importform
    $("#importform").submit(function(e) {
        //prevent Default functionality
        e.preventDefault();
        //get the action-url of the form
        var actionurl = "/" + $("#ptcOrGoogle option:selected").text().toLowerCase() + "Import";
        //do your own request an handle the results
        waitingDialog.show();
        $.ajax({
                url: actionurl,
                type: 'post',
                dataType: 'json',
                data: $("#importform").serialize(),
                success: function(data) {
                    pokemonData = data;
                    $('#pageTabs a[href="#select"]').tab('show');
                    displayPokemon(pokemonData);
                    waitingDialog.hide();
                } , 
                error: function(jqXHR, exception) {
                    var alertMsg = "<div class='alert alert-warning alert-dismissable'>"+
                            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                              '<span aria-hidden="true">&times;</span>' +
                            '</button>' +
                            "There was a problem with reaching the server. Please refresh and try again." +
                        "</div>";
                    $('#alertContainer').html(alertMsg);
                    waitingDialog.hide();
                }
        });
    });
});

var waitingDialog =( function ($) {
    'use strict';

    // Creating modal dialog's DOM
    var $dialog = $(
        '<div class="modal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true" style="padding-top:15%; overflow-y:visible;">' +
        '<div class="modal-dialog modal-sm">' +
        '<div class="modal-content">' +
            '<div class="modal-header"><h3 style="margin:0;"></h3></div>' +
            '<div class="modal-body">' +
                '<div class="progress progress-striped active" style="margin-bottom:0;"><div class="progress-bar" style="width: 100%"></div></div>' +
            '</div>' +
        '</div></div></div>');

    return {
        /**
         * Opens our dialog
         * @param message Custom message
         * @param options Custom options:
         *                options.dialogSize - bootstrap postfix for dialog size, e.g. "sm", "m";
         *                options.progressType - bootstrap postfix for progress bar type, e.g. "success", "warning".
         */
        show: function (message, options) {
            // Assigning defaults
            if (typeof options === 'undefined') {
                options = {};
            }
            if (typeof message === 'undefined') {
                message = 'Loading';
            }
            var settings = $.extend({
                dialogSize: 'm',
                progressType: '',
                onHide: null // This callback runs after the dialog was hidden
            }, options);

            // Configuring dialog
            $dialog.find('.modal-dialog').attr('class', 'modal-dialog').addClass('modal-' + settings.dialogSize);
            $dialog.find('.progress-bar').attr('class', 'progress-bar');
            if (settings.progressType) {
                $dialog.find('.progress-bar').addClass('progress-bar-' + settings.progressType);
            }
            $dialog.find('h3').text(message);
            // Adding callbacks
            if (typeof settings.onHide === 'function') {
                $dialog.off('hidden.bs.modal').on('hidden.bs.modal', function (e) {
                    settings.onHide.call($dialog);
                });
            }
            // Opening dialog
            $dialog.modal();
        },
        /**
         * Closes dialog
         */
        hide: function () {
            $dialog.modal('hide');
        }
    };

})(jQuery);

var pokemonNames = ['','Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle','Blastoise','Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto','Pidgeot','Rattata','Raticate','Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew','Sandslash','NidoranF','Nidorina','Nidoqueen','NidoranM','Nidorino','Nidoking','Clefairy','Clefable','Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat','Oddish','Gloom','Vileplume','Paras','Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck','Golduck','Mankey','Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam','Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude','Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton',"Farfetch'd",'Doduo','Dodrio','Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar','Onix','Drowzee','Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone','Marowak','Hitmonlee','Hitmonchan','Lickitung','Koffing','Weezing','Rhyhorn','Rhydon','Chansey','Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu','Starmie','Mr. Mime','Scyther','Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto','Eevee','Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl','Snorlax','Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew']