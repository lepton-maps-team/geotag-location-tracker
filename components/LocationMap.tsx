import React, { useEffect, useRef } from "react";
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
  currentLocation: LocationData | null;
  onStopRecording: () => void;
};

export default function LocationMap({
  locations,
  currentLocation,
  onStopRecording,
}: LocationMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.Latitude,
          longitude: currentLocation.Longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        },
        500
      );
    }
  }, [currentLocation]);

  const coordinates = locations.map((loc) => ({
    latitude: loc.Latitude,
    longitude: loc.Longitude,
  }));

  const initialRegion = currentLocation
    ? {
        latitude: currentLocation.Latitude,
        longitude: currentLocation.Longitude,
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
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
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
    shadowColor: "#b91c1c",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
