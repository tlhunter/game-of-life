log("main.js loaded");

var GAMEFIELD_WIDTH = 512;
var GAMEFIELD_HEIGHT = 512;
var TILE_WIDTH = 8;
var TILE_HEIGHT = 8;
var CELLS_X = GAMEFIELD_WIDTH / TILE_WIDTH;
var CELLS_Y = GAMEFIELD_HEIGHT / TILE_HEIGHT;

var generation = 0;
var goalPhase = 0;
var $generation = null;
var arena = buildArena();
var arena_init = null;
var context = null;
var starfieldContext = null;
var redraw = null;
var playing = false;
var generations_until_beaten = 0;
var drawstate = null;
var lastKnownHoverPos = {x:-1,y:-1};

var $play = null;
var $stop = null;
var $clear = null;
var $prev = null;
var $next = null;
var $title = null;
var $level_counter = null;
var $desc = null;
var $gamefield = null;
var $piece_count = null;

var colors = {
	abyss:		'rgba(0,0,0,0.3)',
	playable:	'rgba(0,255,0,0.2)',
	deadzone:	'rgba(255,0,0,0.2)',
	alive:		'rgb(175,175,175)',
	grid:		'rgba(255,255,255,0.035)',
	hover:		'rgba(127,63,255,0.5)',
	stars:		[
				'#ffffff',
				'#ffffff',
				'#ffffff',
				'#f0f0f0',
				'#f0f0f0',
				'#cccccc',
				'#e9f29d',
				'#9dc7f2',
				'#f9584c',
	]
};

var current_level = 0; // zero based level system

if (typeof localStorage.level != 'undefined') {
	current_level = parseInt(localStorage.level, 10);
	if (isNaN(current_level)) {
		current_level = 0;
	localStorage.level = 0;
	}
} else {
	localStorage.level = 0;
}

var playables = [];
var deadzones = [];

var goal = {};
var levels = [];

var stars = [];

var render = function() {
	starfieldContext.fillStyle = colors.abyss; // the slight transparency leaves a trail
	starfieldContext.fillRect(0, 0, GAMEFIELD_WIDTH, GAMEFIELD_HEIGHT);

	if (Math.random() < 0.7) {
		stars.push({
			x: Math.floor(Math.random() * GAMEFIELD_WIDTH),
			y: 0,
			speed: Math.random() * 5 + 2,
			color: colors.stars[Math.floor(Math.random() * colors.stars.length)]
		});
	}

	var star = null;
	for (var index in stars) {
		star = stars[index];
		starfieldContext.fillStyle = star.color;
		starfieldContext.fillRect(star.x, star.y, 1, 1);
		star.y += star.speed;
		if (star.y >= GAMEFIELD_HEIGHT) {
			stars.splice(index, 1);
		}
	}

	drawArena();
}

$(function() {
	$.getJSON('./levels.json', function(data) {
		levels = data;
		setupdom();
		loadLevel(current_level);
		init();
		animloop();
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
	$level_counter = $('#level-counter');
	$desc = $('#description .text');
	$generation = $('#generation span');
	$piece_count = $('#piececount span');
	$gamefield = $('#gamefield');

	var gamefield = document.getElementById('gamefield');
	context = gamefield.getContext('2d');

	var starfield = document.getElementById('starfield');
	starfieldContext = starfield.getContext('2d');
}

function init() {
	log("Gamefield Cells: [" + CELLS_X + ", " + CELLS_Y + "]");

	countPlayedPieces();

	//drawArena(); // First Draw

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
		} else if (event.charCode === 99 || event.charCode === 67) { // User pressed 'C'
			event.preventDefault();
			if (!playing) {
				$clear.click();
			}
		} else if (event.charCode === 110 || event.charCode === 78) { // User pressed 'N'
			event.preventDefault();
			if (!$next.prop('disabled')) {
				$next.click();
			}
		} else if (event.charCode === 112 || event.charCode === 80) { // User pressed 'P'
			event.preventDefault();
			if (!$prev.prop('disabled')) {
				$prev.click();
			}
		}
	});

	$gamefield.on('mousedown', function (event) {
		var tile = eventPos(event);
		drawstate = !arena[tile.y][tile.x];
		setTile(tile, drawstate)
	});
	$gamefield.on('mousemove', function (event) {
		var pos = eventPos(event);

		lastKnownHoverPos = {
			x: pos.x,
			y: pos.y
		};

		if (drawstate === null) {
			return;
		}

		setTile(eventPos(event), drawstate);
	});
	$gamefield.on('mouseup', function () {
		drawstate = null;
	});
	$gamefield.on('mouseleave', function() {
		lastKnownHoverPos = {
			x: -1,
			y: -1
		};
	});
}

function eventPos(event) {
	return {
		x: Math.floor((event.pageX - $gamefield.offset().left) / TILE_WIDTH),
		y: Math.floor((event.pageY - $gamefield.offset().top) / TILE_HEIGHT),
	};
}

// Someone clicked a tile and is trying to set the state to something else
function setTile(tile, state) {
	if (playing) {
		log("Cannot change the game while playing.");
		return;
	}

	if (!playables.length) {
		log("This level doesn't have any playable areas. Just click play!");
		return;
	}

	for (var i in playables) {
		if (tile.x >= playables[i].x && tile.y >= playables[i].y && tile.x < playables[i].x + playables[i].width && tile.y < playables[i].y + playables[i].height) {
			if (state === undefined) state = !arena[tile.y][tile.x];
			arena[tile.y][tile.x] = state;
			log("Toggled [" + tile.x + ", " + tile.y + "].");
			countPlayedPieces();
			//drawArena();
			return;
		}
	}

	log("Position [" + tile.x + ", " + tile.y + "] is outside of the playable (pink) zone.");
}

function play() {
	$('#gamefield-wrapper').addClass('playing');
	$stop.attr('disabled', false);
	$clear.attr('disabled', true);
	$play.attr('disabled', true);
	playing = true;

	arena_init = arena.slice(0); // Backup the initial arena state

	//drawArena();
	redraw = setInterval(calculateGeneration, 90);
}

function stop() {
	$('#gamefield-wrapper').removeClass('playing');
	clearTimeout(redraw); 

	$play.attr('disabled', false);
	$stop.attr('disabled', true);
	$clear.attr('disabled', false);

	generation = 0;
	$generation.html(generation);

	playing = false;

	arena = arena_init.slice(0); // Restore the initial arena state
	//drawArena();
}

function nextLevel() {
	$('#gamefield-wrapper').removeClass('playing');
	stop();

	loadLevel(current_level + 1);
}

function prevLevel() {
	$('#gamefield-wrapper').removeClass('playing');
	stop();

	loadLevel(current_level - 1);
}

// This is executed once a level has been won
function winLevel() {
	// Did we already win this level?
	if (generations_until_beaten) {
		return;
	}
	$('#gamefield-wrapper').addClass('won');
	//clearTimeout(redraw); 
	log("Game won in " + generation + " generations!");
	generations_until_beaten = generation;

	if (current_level == levels.length - 1) {
		alert("NOONE SHOULD BE HERE --LEVELORD");
	} else if (current_level == localStorage.level) {
		$next.attr('disabled', false);
		localStorage.level = current_level + 1;
		console.log("beat most recent level. unlocking next level: " + localStorage.level);
	}
}

// Loads the specified level, updating the DOM, and a ton of other things. Use `loadLevel(X)` to cheat and load a level.
function loadLevel(level_id) {
	if (level_id == 0) {
		$prev.attr('disabled', true);
	} else {
		$prev.attr('disabled', false);
	}

	if (level_id == levels.length - 1 || level_id >= parseInt(localStorage.level, 10)) {
		$next.attr('disabled', true);
	} else {
		$next.attr('disabled', false);
	}

	var level = levels[level_id];
	generation = 0;
	generations_until_beaten = 0;
	current_level = level_id;

	$title.html(level.title);
	$level_counter.text((level_id+1) + "/" + levels.length);
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

	$('#library .item').hide();
	if (typeof level.library != "undefined") {
		for (var i = 0; i <= level.library; i++) {
			$('.item#library-' + i).show();
		}
	}

	// Make this the initial state
	arena_init = arena.slice(0);

	//drawArena();
	log("Loaded level #" + (level_id + 1));

	if (!playables.length) {
		$clear.hide();
	} else {
		$clear.show();
	}

	countPlayedPieces();

	$('#gamefield-wrapper').removeClass('won');
}

// Count the number of alive cells in the playable areas (pieces the user has contorl over)
function countPlayedPieces() {
	if (!playables.length) {
		return 0;
	}

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

// Clear all the playable areas
function clear() {
	if (!playables.length) {
		log("There are no playable areas to clear!");
		//drawArena(); // might as well...
		return;
	}

	for (var i in playables) {
		for (var y = playables[i].y; y < playables[i].y + playables[i].height; y++) {
			for (var x = playables[i].x; x < playables[i].x + playables[i].width; x++) {
				arena[y][x] = false;
			}
		}
	}

	log("The playing field has been cleared.");

	//drawArena();
}

// Creates (and returns) a new arena 64x64 array of false's
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

// Draws the entire current level
function drawArena() {
	// MAKE EVERYTHING TRANSPARENT
	context.clearRect(0, 0, GAMEFIELD_WIDTH, GAMEFIELD_HEIGHT);

	// DRAW PLAYABLE ZONES
	context.fillStyle = colors.playable;
	for (var i in playables) {
		context.fillRect(
			playables[i].x * TILE_WIDTH,
			playables[i].y * TILE_HEIGHT,
			playables[i].width * TILE_WIDTH,
			playables[i].height * TILE_HEIGHT
		);
	}

	// DRAW DEAD ZONES
	context.fillStyle = colors.deadzone;
	for (var i in deadzones) {
		context.fillRect(
			deadzones[i].x * TILE_WIDTH,
			deadzones[i].y * TILE_HEIGHT,
			deadzones[i].width * TILE_WIDTH,
			deadzones[i].height * TILE_HEIGHT
		);
	}

	// DRAW LIVING CELLS
	context.fillStyle = colors.alive;
	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			if (arena[y][x]) {
				context.fillRect(x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
			}
		}
	}

	// DRAW GOAL
	context.fillStyle = 'hsla(' + Math.floor((Math.sin(goalPhase++/10)+1)/2*255) + ',50%,50%,0.75)'; // fade between 0.5 and 1 opacity
	context.fillRect(goal.x * TILE_WIDTH, goal.y * TILE_HEIGHT, 1 * TILE_WIDTH, 1 * TILE_HEIGHT);
	if (goalPhase >= 255) {
		goalPhase = 0;
	}

	// DRAW HOVER
	context.fillStyle = colors.hover;
	context.fillRect(lastKnownHoverPos.x * TILE_WIDTH, lastKnownHoverPos.y * TILE_HEIGHT, 1 * TILE_WIDTH, 1 * TILE_HEIGHT);

	// DRAW GRID
	context.fillStyle = colors.grid;
	for (var i = 0; i < CELLS_X; i++) {
		context.fillRect( i * TILE_WIDTH, 0, 1, TILE_WIDTH * CELLS_X);
	}

	for (var i = 0; i < CELLS_Y; i++) {
		context.fillRect( 0, i * TILE_HEIGHT, TILE_HEIGHT * CELLS_Y, 1);
	}
}

// Draw each new generation
function calculateGeneration() {
	generation++;
	$generation.html(generation);

	var new_arena = buildArena();

	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			updateCellState(x, y, new_arena);
		}
	}

	if (arena[goal.y][goal.x]) {
		winLevel();
	}

	arena = new_arena;
	//drawArena();
}

// Examines a specific cell and figures out if it should be alive or dead
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

// Makes hte whole level editable
function god() {
	playables = [{
		x:0,
		y:0,
		width:CELLS_X,
		height:CELLS_Y
	}];

	deadzones = [];

	drawArena();
}

// Creates some JSON you can paste into the levels.json file
function godExport() {
	var pointsInExportFormat = [];

	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			if (arena[y][x]) {
				pointsInExportFormat.push([x,y]);
			}
		}
	}

	console.log(JSON.stringify({
		title: "TITLE",
		description: "DESC",
		goal: goal,
		deadzones: deadzones,
		playables: playables,
		arena: pointsInExportFormat
	}, null, "  "));
}

// Log a message to the on-screen console
function log(msg) {
	$('#console').text(msg);
}

function animloop() {
  requestAnimationFrame(animloop);
  render();
}

