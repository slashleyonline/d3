// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

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
//const NEIGHBORHOOD_SIZE = 8;
//const CACHE_SPAWN_PROBABILITY = 0.1;

//interface for map cell

interface Token {
  value: number;
}

interface MapCell {
  token?: number;
  position: leaflet.LatLng;
  rect?: leaflet.Rectangle;
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

// Create the map

function mapSetup() {
  const map = leaflet.map(mapDiv, {
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
    .addTo(map);

  currentPlayerData.marker.bindTooltip("That's you!");
  currentPlayerData.marker.addTo(map);

  createCell(map);
}

function createCell(map: leaflet.Map): MapCell {
  const newCell: MapCell = {
    //need to set token as a random value later
    position: currentPlayerData.position,

    //need to make the position value random later

    rect: leaflet.rectangle([
      [currentPlayerData.position.lat, currentPlayerData.position.lng],
      [
        currentPlayerData.position.lat + 0.0001,
        currentPlayerData.position.lng + 0.0001,
      ],
    ]),
  };
  newCell.rect!.addTo(map);
  return newCell;
}

mapSetup();
