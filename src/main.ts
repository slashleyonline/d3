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

//interface for map cell

interface Token {
  value: number;
}

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

function createCell(position: leaflet.LatLng): MapCell {
  const newCell: MapCell = {
    //need to set token as a random value later
    position: currentPlayerData.position,
    rect: leaflet.rectangle([
      [position.lat, position.lng],
      [
        position.lat + 0.0001,
        position.lng + 0.0001,
      ],
    ]),
    token: { value: 1 },
  };

  newCell.label = createIcon(
    String(newCell.token!.value),
    newCell.rect!.getBounds().getCenter(),
  );

  newCell.rect!.addEventListener("click", () => {
    if (
      currentPlayerData.marker.getLatLng().distanceTo(
        newCell.rect!.getBounds().getCenter(),
      ) > 0.0003
    ) {
      if (
        (newCell.token !== undefined) &&
        (currentPlayerData.token_held === undefined)
      ) {
        transferTokenToPlayer(newCell);
      } else {
        transferTokenToCell(newCell);
      }
    }
  });

  newCell.rect!.addTo(map);

  return newCell;
}

function spawnCellsGrid() {
  for (let i = -NEIGHBORHOOD_HEIGHT; i < NEIGHBORHOOD_HEIGHT; i++) {
    for (let j = -NEIGHBORHOOD_WIDTH; j < NEIGHBORHOOD_WIDTH; j++) {
      const seed = `${i}, ${j}`;
      if (luck(seed) < 0.25) {
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

    cell.label!.setIcon(leaflet.divIcon({
      html: `<div class="icon"></div>`,
      className: "cellIcon",
    }));

    console.log(
      "Player picked up token of value ",
      currentPlayerData.token_held?.value,
    );
  }
}

function transferTokenToCell(cell: MapCell) {
  if (
    (cell.token !== undefined) && (currentPlayerData.token_held !== undefined)
  ) {
    console.log(cell.token.value);
    console.log(currentPlayerData.token_held.value);
    if (cell.token.value == currentPlayerData.token_held.value) {
      //tokens match, do nothing
      cell.token.value *= 2;
      cell.label!.setIcon(leaflet.divIcon({
        html: `<div class="icon">${cell.token.value}</div>`,
        className: "cellIcon",
      }));
      delete currentPlayerData.token_held;
    }
  } else if (
    (cell.token === undefined) && (currentPlayerData.token_held !== undefined)
  ) {
    //transfer token from player to cell
    cell.token = { value: currentPlayerData.token_held.value };
    delete currentPlayerData.token_held;

    cell.label!.setIcon(leaflet.divIcon({
      html: `<div class="icon">${cell.token.value}</div>`,
      className: "cellIcon",
    }));
  }
}

function createIcon(iconInput: string, position: leaflet.LatLng) {
  const icon = leaflet.divIcon({
    html: `<div class="icon">${iconInput}</div>`,
    className: "cellIcon",
  });
  const marker = leaflet.marker(position, {
    icon: icon,
    interactive: false,
  });
  marker.addTo(map);
  return marker;
}

spawnCellsGrid();
