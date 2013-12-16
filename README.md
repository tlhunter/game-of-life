# Strategic Game of Life

This is an adaptation of Conway's Game of Life, in JavaScript and HTML5 Canvas.
It adds many different game elements and features which don't exist in other
implementations of the game.

The arena is limited to 64x64 cells. The player is limited to changing the
state of cells in small playable zones. There are also dead zones where cells
cannot live. Each level has a goal cell which must become alive in order to
complete the level.

## Local Development

If you download the game locally, and you open the `index.html` file using
Google Chrome (and probably Safari, and very likely Internet Explorer), you
will most likely see an arena that is all white, and nothing happening. By
default, these browsers will not open the `levels.json` file due to CORS
issues.

To fix this, you can execute the browser with the following argument:

	chromium-browser index.html --disable-web-security

This should cause the browser to load the `levels.json` file without any
problems.

## Level Creation

Currently, there are very rudementary tools in place for editing a level.
Specifically, you need to open the developer console and change the state of the
game manually.

Here are some provided hidden functions:

* `god();` - This command will remove all deadzones, and make one giant
playablezone.
* `goal = { x: 0, y: 0 };` - This moves the goal.
* `loadLevel(10);` - This loads a specific level.
* `godLoadAllLevels();` - This loads each level in order, to build the list of
introduced library items.
* `deadzones = [{x:0,y:0,width:20,height:20}];` - This sets all Dead Zones.
* `playables = [{x:0,y:0,width:20,height:20}];` - This sets all Playable Zones.
* `godExport();` - This command will export all the level data you need in order
to copy and paste it into the `levels.json` document.

## UI Elements

### Library

As different patterns are discovered in different game levels, they will be
added to the users library. This doesn't include constructs which appear by
chance, they must be predefined by the level players.

When an item appears in the players library, they can see it and use it as a
reference to recreate the pattern. One day, the feature will exist where a
player can select an item from their library and have it built automatically.

### Toolbar

The Toolbar contains buttons to clear the playable area, play the current
level, stop the level from being played, and proceed to the next level once
the current level is complete.

### Statistics

The Generation counter shows the player what the current generation of the
running level is. The Cells in Play shows the player how many cells are in the
playable zone, e.g., how many Cells has the player elected to use. For scoring
purposes, having the least number of Cells in play is more impressive.

### Console

This shows the player certain messages, and will likely be exchnaged for a
better method of conveying information in the future.

## Gameplay Elements

### Playable Zone

Zones which the user can change are called Playable Zones, and exist as orange
rectangles. By clicking (and dragging), the player can bring cells to life or
kill cells.

### Dead Zone

Zones which cannot contain living cells are called Dead Zones, and appear in
the arena as green rectangles. Much like the edges of the arena, patterns can
be disrupted when they collide with these.

### Goal

A goal appears as a single cell on the map, and is colored blue. The state of
this cell is dead by default, and once it becomes alive, the player has
beaten the level.

## Level Data / Storage Format

### Example Level Format

	{
		"title": "Cool Level",
		"description": "Longer <strong>Description</strong>.",
		"goal": { "x": 48, "y": 56 },
		"introduce": [10],
		"deadzones": [ { "x": 31, "y": 31, "width": 4, "height": 33 } ],
		"playables": [ { "x": 0, "y": 48, "width": 31, "height": 16 } ],
		"arena": [ [ 45, 53 ], [ 46, 53 ], [ 50, 53 ] ]
	}

### Title and Description

These appear in the User Interface when the level is playing. These attributes
will be inserted into the DOM as HTML, so make sure any HTML entities are
escaped beforehand.

### `goal` [required]

This is an object containing an `x` and `y` attribute, and represents the
coordinate of the goal.

### `introduce` [optional]

This attribute is an array of integers, where each integer represents an
item in the library being introduced by this level. These library items
are currently stored in the DOM beforehand.

### `deadzones` [optional]

This attribute is an array of rectangle objects representing the different Dead
Zones of the map. Try to make sure they do not overlap with each other or even
Playable Zones.

### `playables` [optional]

This attribute is an array of rectangle objects representing the different
Playable Zones of the map. Be sure to prevent these from overlapping as well.

It seems counterintuitive, but this attribute is optional. Be sure that the
level will play and beat itself, otherwise the player will not be able to
continue.

### `arena` [optional]

This is an array of simple coordinate arrays, where the first element is the
X coordinate, and the second is the Y coordinate. These do not use the same
coordinate objects seen in the `goal` section in an attempt to make level size
information smaller.
