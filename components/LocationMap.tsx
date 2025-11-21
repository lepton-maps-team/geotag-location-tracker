import { AdaptiveKalman } from "@/lib/filter";
import React, { useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Polyline } from "react-native-maps";

type LocationData = {
  Latitude: number;
  Longitude: number;
  Accuracy: number | null;
  Timestamp: number;
};

type LocationMapProps = {
  locations: LocationData[];
  onNewLocation: (loc: LocationData) => void;
  onStopRecording: () => void;
};

export default function LocationMap({
  locations,
  onNewLocation,
  onStopRecording,
}: LocationMapProps) {
  const mapRef = useRef<MapView>(null);

  const latFilter = useRef(new AdaptiveKalman()).current;
  const lngFilter = useRef(new AdaptiveKalman()).current;

  const handleLocationUpdate = (event: any) => {
    const coordinate = event.nativeEvent?.coordinate;
    if (!coordinate) return;

    const { latitude, longitude, accuracy } = coordinate;

    const smoothLat = parseFloat(
      latFilter.filter(latitude, accuracy).toFixed(6)
    );
    const smoothLng = parseFloat(
      lngFilter.filter(longitude, accuracy).toFixed(6)
    );

    if (locations.length > 0) {
      const prev = locations[locations.length - 1];
      const dx = smoothLat - prev.Latitude;
      const dy = smoothLng - prev.Longitude;
      const distance = Math.sqrt(dx * dx + dy * dy) * 111320;

      if (distance < 0.3) {
        return;
      }
    }

    const loc: LocationData = {
      Latitude: smoothLat,
      Longitude: smoothLng,
      Accuracy: accuracy,
      Timestamp: locations.length + 1,
    };

    onNewLocation(loc);

    mapRef.current?.animateCamera({
      center: {
        latitude: smoothLat,
        longitude: smoothLng,
      },
      zoom: 19,
    });
  };

  const coordinates = locations.map((l) => ({
    latitude: l.Latitude,
    longitude: l.Longitude,
  }));

  const initialRegion =
    locations.length > 0
      ? {
          latitude: locations[0].Latitude,
          longitude: locations[0].Longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }
      : {
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
        showsUserLocation={true}
        followsUserLocation={true}
        showsMyLocationButton={false}
        onUserLocationChange={handleLocationUpdate}
      >
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#2563eb"
            strokeWidth={3}
          />
        )}
      </MapView>

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.stopButton} onPress={onStopRecording}>
          <Text style={styles.stopButtonText}>Stop Recording</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  stopButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
