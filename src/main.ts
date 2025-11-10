// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images
import luck from "./_luck.ts";

// Import our luck function
//import luck from "./_luck.ts";

// Create basic UI elements

// Div for containing all elements in this script

const mainDiv = document.createElement("div");
mainDiv.id = "mainDiv";
document.body.append(mainDiv);

//Div containing the leaflet map

const mapDiv = document.createElement("div");
mapDiv.id = "map";
mainDiv.append(mapDiv);

const playerStatusDiv = document.createElement("div");
playerStatusDiv.id = "playerStatusDiv";
mainDiv.append(playerStatusDiv);
playerStatusDiv.innerHTML = "Current token: None";

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters

const GAMEPLAY_ZOOM_LEVEL = 19;
//made 1e-4 for the 0.0001 degree requirement
//const TILE_DEGREES = 1e-4;
//size of the area for spawning chaches
const NEIGHBORHOOD_HEIGHT = 8;
const NEIGHBORHOOD_WIDTH = 28;
//const CACHE_SPAWN_PROBABILITY = 0.1;

// will keep as a data type for now but if there are no more attributes, it can be removed

interface Token {
  value: number;
}

//Area on the map that potentially stores a token

interface MapCell {
  token?: Token;
  position: leaflet.LatLng;
  rect?: leaflet.Rectangle;
  label?: leaflet.Marker;
}

interface PlayerData {
  position: leaflet.LatLng;
  marker: leaflet.Marker;
  token_held?: Token;
}

const currentPlayerData: PlayerData = {
  position: CLASSROOM_LATLNG,
  marker: leaflet.marker(CLASSROOM_LATLNG),
};

const map: leaflet.Map = mapSetup();

// Create the map

function mapSetup() {
  const newMap = leaflet.map(mapDiv, {
    center: CLASSROOM_LATLNG,
    zoom: GAMEPLAY_ZOOM_LEVEL,
    minZoom: GAMEPLAY_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false,
  });

  // Populate the map with a background tile layer
  leaflet
    .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(newMap);

  currentPlayerData.marker.bindTooltip("That's you!");
  currentPlayerData.marker.addTo(newMap);
  return newMap;
}

//function for defining a cell on the map
function createCell(inputPosition: leaflet.LatLng): MapCell {
  const newCell: MapCell = {
    position: inputPosition,
    rect: leaflet.rectangle([
      [inputPosition.lat, inputPosition.lng],
      [
        inputPosition.lat + 0.0001,
        inputPosition.lng + 0.0001,
      ],
    ]),
    token: { value: 1 },
  };
  newCell.label = createIcon(
    String(newCell.token!.value),
    newCell.rect!.getBounds().getCenter(),
  );
  addCellEventListener(newCell);
  newCell.rect!.addTo(map);

  return newCell;
}

// thank you auto-formatter. very cool

function addCellEventListener(inputCell: MapCell) {
  inputCell.rect!.addEventListener("click", () => {
    if (
      currentPlayerData.marker.getLatLng().distanceTo(
        inputCell.rect!.getBounds().getCenter(),
      ) > 0.0003
    ) {
      if (
        (inputCell.token !== undefined) &&
        (currentPlayerData.token_held === undefined)
      ) {
        transferTokenToPlayer(inputCell);
      } else {
        transferTokenToCell(inputCell);
      }
    }
  });
}

function spawnCellsGrid() {
  for (let i = -NEIGHBORHOOD_HEIGHT; i < NEIGHBORHOOD_HEIGHT; i++) {
    for (let j = -NEIGHBORHOOD_WIDTH; j < NEIGHBORHOOD_WIDTH; j++) {
      const seed = `${i}, ${j}`;
      if (luck(seed) < 0.18) {
        //create cell at offset position
        const tilePosition = leaflet.latLng(
          CLASSROOM_LATLNG.lat + i * 0.0001,
          CLASSROOM_LATLNG.lng + j * 0.0001,
        );
        createCell(tilePosition);
      }
    }
  }
}

function transferTokenToPlayer(cell: MapCell) {
  if (
    (cell.token !== undefined) && (currentPlayerData.token_held === undefined)
  ) {
    //transfer token from cell to player
    currentPlayerData.token_held = { value: cell.token.value };
    delete cell.token;

    cell.label!.setIcon(setIconString(" "));
  }
}

function transferTokenToCell(cell: MapCell) {
  if (
    (cell.token !== undefined) && (currentPlayerData.token_held !== undefined)
  ) {
    console.log(cell.token.value);
    console.log(currentPlayerData.token_held.value);
    if (cell.token.value == currentPlayerData.token_held.value) {
      cell.token.value *= 2;
      cell.label!.setIcon(setIconString(String(cell.token.value)));
      delete currentPlayerData.token_held;
    }
  } else if (
    (cell.token === undefined) && (currentPlayerData.token_held !== undefined)
  ) {
    //transfer token from player to cell
    cell.token = { value: currentPlayerData.token_held.value };
    delete currentPlayerData.token_held;

    cell.label!.setIcon(setIconString(String(cell.token.value)));
  }
}

function createIcon(iconInput: string, position: leaflet.LatLng) {
  const marker = leaflet.marker(position, {
    icon: setIconString(iconInput),
    interactive: false,
  });
  marker.addTo(map);
  return marker;
}

function setIconString(iconInput: string): leaflet.DivIcon {
  const icon = leaflet.divIcon({
    html: `<div class="icon">${iconInput}</div>`,
    className: "cellIcon",
  });
  return icon;
}

spawnCellsGrid();
