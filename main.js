log("main.js loaded");

var GAMEFIELD_WIDTH = 512;
var GAMEFIELD_HEIGHT = 512;
var TILE_WIDTH = 8;
var TILE_HEIGHT = 8;
var CELLS_X = GAMEFIELD_WIDTH / TILE_WIDTH;
var CELLS_Y = GAMEFIELD_HEIGHT / TILE_HEIGHT;

var generation = 0;
var $generation = null;
var arena = buildArena();
var arena_init = null;
var context = null;
var redraw = null;
var playing = false;
var generations_until_beaten = 0;

var $play = null;
var $stop = null;
var $clear = null;
var $prev = null;
var $next = null;
var $title = null;
var $desc = null;
var $gamefield = null;
var $piece_count = null;

var colors = {
	goal:		"rgb(0,127,255)",
	playable:	"rgba(255,127,0, 0.3)",
	deadzone:	"rgba(127,127,0,0.3)",
	dead:		"rgb(255,255,255)",
	alive:		"rgb(0,0,0)",
	grid:		"rgba(0,0,0,0.1)",
}

var current_level = 0; // zero based level system
var level_earned = 0;

var playables = [];
var deadzones = [];

var goal = {};
var levels = [];

$(function() {
	$.getJSON('./levels.json', function(data) {
		levels = data;
		setupdom();
		loadLevel(current_level);
		init();
	});
});

function setupdom() {
	log("DOM Ready");

	$play = $('#button-play');
	$stop = $('#button-stop');
	$clear = $('#button-clear');
	$prev = $('#button-level-prev');
	$next = $('#button-level-next');

	$title = $('#title');
	$desc = $('#description .text');
	$generation = $('#generation span');
	$piece_count = $('#piececount span');
	$gamefield = $('#gamefield');

	var gamefield = document.getElementById('gamefield');
	context = gamefield.getContext('2d');
}

function init() {
	log("Gamefield Cells: [" + CELLS_X + ", " + CELLS_Y + "]");

	countPlayedPieces();

	drawArena(); // First Draw

	$play.on('click', play);
	$stop.on('click', stop);
	$clear.on('click', clear);
	$next.on('click', nextLevel);
	$prev.on('click', prevLevel);

	$(document).keypress(function(event) {
		if (event.charCode === 32) { // User pressed space
			event.preventDefault();
			if (playing) {
				stop();
			} else {
				play();
			}
		} else if (event.charCode === 99 || event.charCode === 67) { // User pressed 'c'
			event.preventDefault();
			if (!playing) {
				$clear.click();
			}
		} else if (event.charCode === 110 || event.charCode === 78) { // User pressed 'n'
			event.preventDefault();
			if (generations_until_beaten) {
				$next.click();
			}
		}
	});

	$gamefield.on('click', function(event) {
		var tile = {
			x: Math.floor((event.pageX - $gamefield.offset().left) / TILE_WIDTH),
			y: Math.floor((event.pageY - $gamefield.offset().top) / TILE_HEIGHT),
		};

		if (playing) {
			log("Cannot change the game while playing.");
			return;
		}

		for (var i in playables) {
			if (tile.x >= playables[i].x && tile.y >= playables[i].y && tile.x < playables[i].x + playables[i].width && tile.y < playables[i].y + playables[i].height) {
				arena[tile.y][tile.x] = !arena[tile.y][tile.x];
				log("Toggled [" + tile.x + ", " + tile.y + "].");
				countPlayedPieces();
				drawArena();
				return;
			}
		}

		log("Position [" + tile.x + ", " + tile.y + "] is outside of the playable (pink) zone.");
	});
}

function play() {
	$stop.attr('disabled', false);
	$clear.attr('disabled', true);
	$play.attr('disabled', true);
	playing = true;

	arena_init = arena.slice(0); // Backup the initial arena state

	drawArena();
	redraw = setInterval(animate, 100);
}

function stop() {
	clearTimeout(redraw); 

	$play.attr('disabled', false);
	$stop.attr('disabled', true);
	$clear.attr('disabled', false);

	generation = 0;
	$generation.html(generation);

	playing = false;

	arena = arena_init.slice(0); // Restore the initial arena state
	drawArena();
}

function nextLevel() {
	stop();

	$next.attr('disabled', true);
	//$prev.attr('disabled', false);

	current_level++;
	loadLevel(current_level);
}

function prevLevel() {
	alert("not yet implemented!");
}

function winLevel() {
	$('#gamefield-wrapper').addClass('won');
	$next.attr('disabled', false);
	//clearTimeout(redraw); 
	log("Game won in " + generation + " generations!");
	generations_until_beaten = generation;

	if (current_level == levels.length - 1) {
		alert("You've won the game!");
	} else if (current_level == level_earned) {
		level_earned++;
		console.log("beat most recent level. unlocking next level: " + level_earned);
	}
}

function loadLevel(level_id) {
	var level = levels[level_id];
	generation = 0;
	generations_until_beaten = 0;
	current_level = level_id;

	$title.text(level.title);
	$desc.html(level.description);
	goal = level.goal;

	if (typeof level.playables != "undefined") {
		playables = level.playables;
	} else {
		playables = [];
	}

	arena = buildArena(); // Reset arena to nothing

	// Build new arena
	if (typeof level.arena != "undefined") {
		for (var coord in level.arena) {
			arena[level.arena[coord][1]][level.arena[coord][0]] = true;
		}
	}

	if (typeof level.deadzones != "undefined") {
		deadzones = level.deadzones;
	} else {
		deadzones = [];
	}

	if (typeof level.introduce != "undefined") {
		for (i in level.introduce) {
			$('#library-' + level.introduce[i]).show();
		}
	}

	// Make this the initial state
	arena_init = arena.slice(0);

	drawArena();
	log("Loaded level #" + (level_id + 1));

	if (!playables) {
		$clear.hide();
	} else {
		$clear.show();
	}

	countPlayedPieces();

	$('#gamefield-wrapper').removeClass('won');
}

function countPlayedPieces() {
	var counter = 0;

	for (var i in playables) {
		for (var y = playables[i].y; y < playables[i].y + playables[i].height; y++) {
			for (var x = playables[i].x; x < playables[i].x + playables[i].width; x++) {
				if (arena[y][x]) {
					counter++;
				}
			}
		}
	}
	$piece_count.text(counter);

	return counter;
}

function clear() {
	for (var i in playables) {
		for (var y = playables[i].y; y < playables[i].y + playables[i].height; y++) {
			for (var x = playables[i].x; x < playables[i].x + playables[i].width; x++) {
				arena[y][x] = false;
			}
		}
	}

	log("The playing field has been cleared.");

	drawArena();
}

function buildArena() {
	var new_arena = [];

	for (var y = 0; y < CELLS_Y; y++) {
		new_arena[y] = [];
		for (var x = 0; x < CELLS_X; x++) {
			new_arena[y][x] = false;
		}
	}

	return new_arena;
}

function drawArena() {
	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			if (goal.x == x && goal.y == y) {
				context.fillStyle = colors.goal;
				if (arena[y][x] && !generations_until_beaten) {
					winLevel();
				}
			} else if (arena[y][x]) {
				context.fillStyle = colors.alive;
			} else {
				context.fillStyle = colors.dead;
			}
			context.fillRect(x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
		}
	}

	// Draw playable zone (if applicable)
	context.fillStyle = colors.playable;
	for (var i in playables) {
		context.fillRect(
			playables[i].x * TILE_WIDTH,
			playables[i].y * TILE_HEIGHT,
			playables[i].width * TILE_WIDTH,
			playables[i].height * TILE_HEIGHT
		);
	}

	// Draw dead zones (if applicable)
	context.fillStyle = colors.deadzone;
	for (var i in deadzones) {
		context.fillRect(
			deadzones[i].x * TILE_WIDTH,
			deadzones[i].y * TILE_HEIGHT,
			deadzones[i].width * TILE_WIDTH,
			deadzones[i].height * TILE_HEIGHT
		);
	}

	context.fillStyle = colors.grid;
	for (var i = 0; i < CELLS_X; i++) {
		context.fillRect(
			i * TILE_WIDTH,
			0,
			1,
			TILE_WIDTH * CELLS_X
		);
	}
		
	for (var i = 0; i < CELLS_Y; i++) {
		context.fillRect(
			0,
			i * TILE_HEIGHT,
			TILE_HEIGHT * CELLS_Y,
			1
		);
	}
}

// Draw each new generation
function animate() {
	generation++;
	$generation.html(generation);

	var new_arena = buildArena();

	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			updateCellState(x, y, new_arena);
		}
	}

	arena = new_arena;
	drawArena();
}

function updateCellState(x, y, new_arena) {
	var cell_state = arena[y][x];
	var living_neighbors = 0;

	for (var mod_x = -1; mod_x <= 1; mod_x++) {
		for (var mod_y = -1; mod_y <= 1; mod_y++) {
			if (x + mod_x >= 0 && x + mod_x < CELLS_X && // Is this X coordinate outside of the array?
				y + mod_y >= 0 && y + mod_y < CELLS_Y && // Is this Y coordinate outside of the array?
				(!(mod_y == 0 && mod_x == 0)) && // Not looking at self but neighbor
				arena[y + mod_y][x + mod_x]) { // Is this cell alive?

			   living_neighbors++;
		   }
		}
	}

	for (var i in deadzones) {
		if (deadzones[i].x <= x && deadzones[i].x+deadzones[i].width > x && deadzones[i].y <= y && deadzones[i].y+deadzones[i].height > y) {
			new_arena[y][x] = false;
			return;
		}
	}

	if (cell_state) { // Cell is alive
		if (living_neighbors < 2) { // Under-Population
			new_arena[y][x] = false;
		} else if (living_neighbors > 3) { // Over-Crowding
			new_arena[y][x] = false;
		} else { // live on
			new_arena[y][x] = true;
		}
	} else { // Cell is dead
		if (living_neighbors == 3) { // Reproduction
			new_arena[y][x] = true;
		} else {
			new_arena[y][x] = false;
		}
	}
}

function god() {
	playable = [{
		x:0,
		y:0,
		width:CELLS_X,
		height:CELLS_Y
	}];

	drawArena();
}

function godExport() {
	var pointsInExportFormat = [];
	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			if (arena[y][x]) {
				pointsInExportFormat.push([x,y]);
			}
		}
	}
	console.log(JSON.stringify(pointsInExportFormat));
}

function log(msg) {
	$('#console').text(msg);
}
