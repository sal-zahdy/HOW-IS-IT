"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { categoryInfo, scoreColor, type Place } from "@/lib/types";

const [centerLat, centerLng] = (process.env.NEXT_PUBLIC_MAP_CENTER ?? "30.064554,31.2788107")
  .split(",")
  .map(Number);
const zoom = Number(process.env.NEXT_PUBLIC_MAP_ZOOM ?? 17);

function pinIcon(place: Place) {
  return L.divIcon({
    className: "",
    html: `<div class="place-pin" style="background:${scoreColor(place.stats)}">${categoryInfo(place.category).icon}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function CampusMap({
  places,
  onSelect,
}: {
  places: Place[];
  onSelect: (place: Place) => void;
}) {
  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={zoom}
      maxZoom={20}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
        maxZoom={20}
      />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={pinIcon(place)}
          title={place.name}
          eventHandlers={{ click: () => onSelect(place) }}
        />
      ))}
    </MapContainer>
  );
}
