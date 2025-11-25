//D3.C COMPLETE!!!!

// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images
import luck from "./_luck.ts";

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

const coordsDiv = document.createElement("div");
coordsDiv.id = "coordsDiv";
mainDiv.append(coordsDiv);

const centerMapButton = document.createElement("button");
centerMapButton.id = "centerMapButton";
centerMapButton.innerHTML = "Center Map on Player";
centerMapButton.addEventListener("click", () => {
  map.setView(currentPlayerData.position, GAMEPLAY_ZOOM_LEVEL);
});
mainDiv.append(centerMapButton);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
//made 1e-4 for the 0.0001 degree requirement
//const TILE_DEGREES = 1e-4;
const WIN_SCORE = 16; // temporary, will move to 256 later

// Debug mode flag - when true, player position follows map center
const debugMode = false;

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
  visible?: boolean;
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

//Dictionary of all map cells onscreen, preserving only modified cells
const cellsMap = new Map<string, MapCell>();

let centered = false;

map.addEventListener("move", () => {
  if (debugMode) {
    currentPlayerData.moveTo(map.getCenter());
  }
  removeCellsOutsideView();
  spawnCellsLocation();
  coordsDiv.innerHTML = `Lat: ${
    currentPlayerData.position.lat.toFixed(
      6,
    )
  }, Lng: ${currentPlayerData.position.lng.toFixed(6)}`;
});

addEventListener("tokenChanged", () => {
  if (currentPlayerData.token_held !== undefined) {
    playerStatusDiv.innerHTML = "Current token: " +
      currentPlayerData.token_held?.value.toString();

    localStorage.setItem(
      "playerToken",
      (currentPlayerData.token_held!).value!.toString(),
    );
  } else {
    playerStatusDiv.innerHTML = "Current token: None";
    localStorage.setItem(
      "playerToken",
      "NaN",
    );
  }

  localStorage.setItem(
    "cellsMap",
    JSON.stringify(
      Array.from(
        cellsMap.entries().map(([key, cell]) => {
          const value = {
            value: cell.token?.value,
            key: key,
          };
          console.log("key is " + key);
          return JSON.stringify(value);
        }),
      ),
    ),
  );
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

function createRectangle(inputPosition: leaflet.LatLng): leaflet.Rectangle {
  const rectangle: leaflet.Rectangle = leaflet.rectangle([
    [inputPosition.lat, inputPosition.lng],
    [inputPosition.lat + 0.0001, inputPosition.lng + 0.0001],
  ]);
  return rectangle;
}

//function for defining a cell on the map
function genCell(inputPosition: leaflet.LatLng): MapCell {
  const newCell: MapCell = {
    position: inputPosition,
    token: { value: 0 },
    visible: true,
  };
  const seed = `${inputPosition.lat}, ${inputPosition.lng}`;

  if (luck(seed) < 0.18) {
    newCell.token = { value: 1 };
    newCell.rect = createRectangle(inputPosition);

    newCell.label = createIcon(
      String(newCell.token!.value),
      newCell.rect.getBounds().getCenter(),
    );
    addCellEventListener(newCell);
    newCell.rect.addTo(map);
  }

  return newCell;
}

function createCell(
  inputPosition: leaflet.LatLng,
  tokenValue: number,
): MapCell {
  const newCell: MapCell = {
    position: inputPosition,
    visible: true,
    token: { value: tokenValue },
  };

  if (tokenValue === -1) {
    console.log("this time im really gonna do it");
    delete newCell.token;
    newCell.rect = createRectangle(inputPosition);
    newCell.label = createIcon(
      " ",
      newCell.rect!.getBounds().getCenter(),
    );
  } else if (tokenValue > 0) {
    newCell.rect = createRectangle(inputPosition);
    newCell.label = createIcon(
      String(newCell.token!.value),
      newCell.rect!.getBounds().getCenter(),
    );
  }

  newCell.rect!.addTo(map);
  addCellEventListener(newCell);

  return newCell;
}

//function for restoring a cell that was removed from the map, the "memento".

function RestoreCell(inputCell: MapCell) {
  if (inputCell.token !== undefined) {
    if (inputCell.token.value > 0) {
      inputCell.rect = createRectangle(inputCell.position);
      inputCell.label = createIcon(
        String(inputCell.token!.value),
        inputCell.rect.getBounds().getCenter(),
      );
      inputCell.visible = true;
      inputCell.rect!.addTo(map);
      addCellEventListener(inputCell);
    }
  }
}

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
        cellsMap.set(key, genCell(tilePosition));
      } else {
        if (cellsMap.get(key)!.visible === false) {
          RestoreCell(cellsMap.get(key)!);
        }
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
    cellsMap.set(String(`${cell.position.lat},${cell.position.lng}`), cell);
  }
}

function transferTokenToCell(cell: MapCell) {
  if (
    (cell.token !== undefined) && (currentPlayerData.token_held !== undefined)
  ) {
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

    cellsMap.set(String(`${cell.position.lat},${cell.position.lng}`), cell);
  }
}

function removeCellsOutsideView() {
  const bounds = map.getBounds();
  for (const [key, cell] of cellsMap) {
    if (!bounds.contains(cell.position) && cell.token !== undefined) {
      if (cell.rect && cell.label) {
        map.removeLayer(cell.rect);
        map.removeLayer(cell.label);
      }
      cell.visible = false;

      //this is where the flyweight pattern is applied.
      //most cells are either 1 or 0, preserving only the data for modified cells.

      if (cell.token!.value == 1 || cell.token!.value == 0) {
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

function startup() {
  if (localStorage.getItem("playerToken") !== "NaN") {
    currentPlayerData.token_held = {
      value: Number(localStorage.getItem("playerToken")!),
    };
    requestLocation();
  }

  if (localStorage.getItem("cellsMap")) {
    const loadedCellsMap: Array<string> = JSON.parse(
      localStorage.getItem("cellsMap")!,
    );

    for (const entry of loadedCellsMap.entries()) {
      let tokenValue = JSON.parse(entry[1]).value;
      if (JSON.parse(entry[1]).value === undefined) {
        console.log("undefined token value");
        tokenValue = " ";
      }

      if ((tokenValue !== 0) && (tokenValue !== " ")) {
        const cellPosition = LatLngFromString(JSON.parse(entry[1]).key);
        const restoredCell = createCell(cellPosition, tokenValue);
        const key = `${restoredCell.position.lat},${restoredCell.position.lng}`;
        cellsMap.set(key, restoredCell);
      } else if (tokenValue === " ") {
        console.log("restoring empty cell");
        const cellPosition = LatLngFromString(JSON.parse(entry[1]).key);
        const restoredCell = createCell(cellPosition, -1);
        const key = `${restoredCell.position.lat},${restoredCell.position.lng}`;
        cellsMap.set(key, restoredCell);
      }
    }
    console.log(cellsMap);
    dispatchEvent(tokenChangedEvent);
  }
}

function LatLngFromString(latlngString: string): leaflet.LatLng {
  const parts = latlngString.split(",");
  console.log("string: " + latlngString);
  const lat = parseFloat(parts[0]);
  console.log("lat: " + lat.toString());
  const lng = parseFloat(parts[1]);
  console.log("lng: " + lng.toString());
  return leaflet.latLng(lat, lng);
}

function playerMove(pos: GeolocationPosition) {
  const newPlayerLatLng = leaflet.latLng(
    pos.coords.latitude,
    pos.coords.longitude,
  );
  currentPlayerData.moveTo(newPlayerLatLng);
  if (!centered) {
    map.setView(newPlayerLatLng, GAMEPLAY_ZOOM_LEVEL);
    centered = true;
  }
}

async function requestLocation() {
  const result = await navigator.permissions.query({ name: "geolocation" });
  if ((result.state === "granted") || (result.state === "prompt")) {
    console.log("Asking for location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsDiv.innerHTML = "Got position: " + pos.coords.latitude +
          pos.coords.longitude;
        playerMove(pos);
      },
      (err) => {
        coordsDiv.innerHTML = "Geolocation error: " + err;
      },
    );
  }
}

function MoveCall() {
  requestLocation();
  setTimeout(MoveCall, 3000);
  mainDiv.append(testDiv);
}

startup();
spawnCellsLocation();

dispatchEvent(tokenChangedEvent);

MoveCall();
const testDiv = document.createElement("div");

if (!navigator.geolocation) {
  testDiv.innerHTML = "geolocation not supported on this phone!";
} else {
  testDiv.innerHTML = "geolocation suppported!";
}
mainDiv.append(testDiv);
