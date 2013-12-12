console.log("main.js loaded");

var GAMEFIELD_WIDTH = 512;
var GAMEFIELD_HEIGHT = 512;
var TILE_WIDTH = 8;
var TILE_HEIGHT = 8;
var CELLS_X = GAMEFIELD_WIDTH / TILE_WIDTH;
var CELLS_Y = GAMEFIELD_HEIGHT / TILE_HEIGHT;

var PLAYABLE = {
	x: 24,
	y: 24,
	width: 16,
	height: 16,
};

$(function() {
	console.log("DOM Ready");

	var $play = $('#button-play');
	var $stop = $('#button-stop');
	var $prev = $('#button-level-prev');
	var $next = $('#button-level-next');

	var $title = $('#title');
	var $generation = $('#generation');
	var $gamefield = $('#gamefield');

	var gamefield = document.getElementById('gamefield');
	var context = gamefield.getContext('2d');

	console.log("Gamefield Cells: " + CELLS_X + ", " + CELLS_Y);

	var arena = buildArena(CELLS_X, CELLS_Y);

	// Game Stuff
	
	goal = {
		x: 50,
		y: 50,
	};

	// Quick lil' glider
	arena[10][20] = true;
	arena[11][20] = true;
	arena[12][20] = true;
	arena[12][19] = true;
	arena[11][18] = true;

	drawArena(context, arena, PLAYABLE, goal); // First Draw

	$play.on('click', function() {
		console.log('play!');
		$stop.attr('disabled', false);
		$play.attr('disabled', true);
	});

	$stop.on('click', function() {
		console.log('stop!');
		$play.attr('disabled', false);
		$stop.attr('disabled', true);
	});

	$gamefield.on('click', function(event) {
		var tile = {
			x: Math.floor(event.offsetX / TILE_WIDTH),
			y: Math.floor(event.offsetY / TILE_HEIGHT),
		};

		if (tile.x >= PLAYABLE.x && tile.y >= PLAYABLE.y && tile.x < PLAYABLE.x + PLAYABLE.width && tile.y < PLAYABLE.x + PLAYABLE.height) {
			arena[tile.y][tile.x] = !arena[tile.y][tile.x];
		}

		drawArena(context, arena, PLAYABLE, goal); // First Draw
	});
});

function buildArena(constraint_x, constraint_y) {
	var arena = [];

	for (var y = 0; y < constraint_y; y++) {
		arena[y] = [];
		for (var x = 0; x < constraint_x; x++) {
			arena[y][x] = false;
		}
	}

	return arena;
}

function drawArena(context, arena, playable, goal) {
	for (var y = 0; y < CELLS_Y; y++) {
		for (var x = 0; x < CELLS_X; x++) {
			if (goal.x == x && goal.y == y) {
				context.fillStyle = "rgb(0,127,255)";
				if (arena[y][x]) {
					alert("you won!");
				}
			} else if (arena[y][x]) {
				context.fillStyle = "rgb(0,0,0)";
			} else {
				context.fillStyle = "rgb(255,255,255)";
			}
			context.fillRect(x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
		}
	}

	context.fillStyle = "rgba(0,0,0, 0.1)";
	context.fillRect(
		playable.x * TILE_WIDTH,
		playable.y * TILE_HEIGHT,
		playable.width * TILE_WIDTH,
		playable.height * TILE_HEIGHT
	);
}
