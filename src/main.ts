//D3.B COMPLETE!!!!

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

const winnerDiv = document.createElement("div");
winnerDiv.id = "winnerDiv";
winnerDiv.innerHTML = "You win!";
winnerDiv.style.fontSize = "48px";
winnerDiv.style.color = "red";
winnerDiv.style.display = "none";
mainDiv.append(winnerDiv);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

addEventListener("tokenChanged", () => {
  if (currentPlayerData.token_held !== undefined) {
    playerStatusDiv.innerHTML = "Current token: " +
      currentPlayerData.token_held?.value.toString();
  } else {
    playerStatusDiv.innerHTML = "Current token: None";
  }
});

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
//made 1e-4 for the 0.0001 degree requirement
//const TILE_DEGREES = 1e-4;
const WIN_SCORE = 16; // temporary, will move to 256 later

// Debug mode flag - when true, player position follows map center
const debugMode = true;

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
  moveTo(newPosition: leaflet.LatLng): void;
}

const currentPlayerData: PlayerData = {
  position: CLASSROOM_LATLNG,
  marker: leaflet.marker(CLASSROOM_LATLNG),
  moveTo(newPosition: leaflet.LatLng) {
    this.position = newPosition;
    this.marker.setLatLng(newPosition);
  },
};

const tokenChangedEvent = new CustomEvent("tokenChanged");

const map: leaflet.Map = mapSetup();
const cellsMap = new Map<string, MapCell>();

map.addEventListener("move", () => {
  if (debugMode) {
    currentPlayerData.moveTo(map.getCenter());
  }
  console.log("total cells: ", cellsMap.size);
  removeCellsOutsideView();
  spawnCellsLocation();
});

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
    token: { value: 0 },
  };
  const seed = `${inputPosition.lat}, ${inputPosition.lng}`;

  if (luck(seed) < 0.18) {
    newCell.token = { value: 1 };
    newCell.rect = leaflet.rectangle([
      [inputPosition.lat, inputPosition.lng],
      [
        inputPosition.lat + 0.0001,
        inputPosition.lng + 0.0001,
      ],
    ]);

    newCell.label = createIcon(
      String(newCell.token!.value),
      newCell.rect.getBounds().getCenter(),
    );
    addCellEventListener(newCell);
    newCell.rect!.addTo(map);
  }

  return newCell;
}

// thank you auto-formatter. very cool

function addCellEventListener(inputCell: MapCell) {
  inputCell.rect!.addEventListener("click", () => {
    if (
      currentPlayerData.marker.getLatLng().distanceTo(
        inputCell.rect!.getBounds().getCenter(),
      ) < 25
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
    dispatchEvent(tokenChangedEvent);
  });
}

function spawnCellsLocation() {
  const bounds = map.getBounds();
  const north = Math.ceil(bounds.getNorth() / 0.0001);
  const south = Math.floor(bounds.getSouth() / 0.0001);
  const east = Math.ceil(bounds.getEast() / 0.0001);
  const west = Math.floor(bounds.getWest() / 0.0001);

  for (let lat = south; lat < north; lat++) {
    for (let lng = west; lng < east; lng++) {
      const tilePosition = leaflet.latLng(lat * 0.0001, lng * 0.0001);
      const key = `${tilePosition.lat},${tilePosition.lng}`;
      if (!cellsMap.has(key)) {
        cellsMap.set(key, createCell(tilePosition));
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
    if (currentPlayerData.token_held.value >= WIN_SCORE) {
      winnerDiv.style.display = "block";
    }
    delete cell.token;
    cell.label!.setIcon(setIconString(" "));
    cellsMap.set(String(cell.position), cell);
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

    cellsMap.set(String(cell.position), cell);
  }
}

function removeCellsOutsideView() {
  const bounds = map.getBounds();
  for (const [key, cell] of cellsMap) {
    if (!bounds.contains(cell.position)) {
      if (cell.rect !== undefined) {
        map.removeLayer(cell.rect);
      }
      if (cell.label !== undefined) {
        map.removeLayer(cell.label);
      }
      if (cell.token?.value == 1 || cell.token?.value == 0) {
        cellsMap.delete(key);
      }
    }
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

spawnCellsLocation();
