import { blocks, districts } from "@/constants/lists";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import React, { useState } from "react";
import {
  Alert,
  Button,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type LocationData = {
  Latitude: number;
  Longitude: number;
  Accuracy: number | null;
  Timestamp: number;
};

type SessionMeta = {
  Name: string;
  State: string;
  District: string;
  Block: string;
  Ring: string;
  ChildRing: string;
};

type RecordingSession = {
  meta: SessionMeta;
  path: LocationData[];
};

const STORAGE_KEY = "RECORDINGS";

const LocationScreen: React.FC = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [path, setPath] = useState<LocationData[]>([]);
  const [meta, setMeta] = useState<SessionMeta>({
    Name: "",
    State: "",
    District: "",
    Block: "",
    Ring: "",
    ChildRing: "",
  });
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subscription, setSubscription] =
    useState<Location.LocationSubscription | null>(null);

  // Ask for metadata first
  const handleStartPress = () => {
    setShowDialog(true);
  };

  // Start location recording
  const startRecording = async () => {
    setShowDialog(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permission denied");
      return;
    }

    setIsRecording(true);
    setPath([]);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 0,
        timeInterval: 0, // only on movement
      },
      (loc: Location.LocationObject) => {
        const data: LocationData = {
          Latitude: parseFloat(loc.coords.latitude.toFixed(6)),
          Longitude: parseFloat(loc.coords.longitude.toFixed(6)),
          Accuracy: loc.coords.accuracy ?? null,
          Timestamp: Math.floor(loc.timestamp / 1000),
        };
        setLocation(data);
        setPath((prev) => [...prev, data]);
      }
    );

    setSubscription(sub);
  };

  // Stop and save session
  const stopRecording = async () => {
    setIsRecording(false);
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }

    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const oldSessions: RecordingSession[] = existing
        ? JSON.parse(existing)
        : [];

      const newSession: RecordingSession = { meta, path };
      const updated = [...oldSessions, newSession];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      Alert.alert(
        "Recording Saved",
        `Saved ${path.length} points for ${meta.Name || "Unnamed"}`
      );
    } catch (error) {
      console.error("Error saving data:", error);
      Alert.alert("Error", "Could not save location data.");
    }
  };

  // Validate dialog fields before starting
  const handleDialogStart = () => {
    if (!meta.Name || !meta.State || !meta.District) {
      Alert.alert("Missing info", "Please fill Name, State, and District.");
      return;
    }
    startRecording();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Location Tracker</Text>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      {location ? (
        <>
          <Text style={styles.text}>Latitude: {location.Latitude}</Text>
          <Text style={styles.text}>Longitude: {location.Longitude}</Text>
          <Text style={styles.text}>Accuracy: {location.Accuracy} m</Text>
          <Text style={styles.text}>Timestamp: {location.Timestamp}</Text>
        </>
      ) : (
        <Text style={styles.text}>Waiting for location...</Text>
      )}

      <View style={{ marginTop: 20 }}>
        {!isRecording ? (
          <Button title="Start Recording" onPress={handleStartPress} />
        ) : (
          <Button title="Stop Recording" color="red" onPress={stopRecording} />
        )}
      </View>

      {/* Dialog Modal */}
      <Modal visible={showDialog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Session Details</Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              value={meta.Name}
              onChangeText={(t) => setMeta({ ...meta, Name: t })}
            />

            <Picker
              selectedValue={meta.State}
              onValueChange={(v) => setMeta({ ...meta, State: v })}
            >
              <Picker.Item label="Select State" value="" />
              <Picker.Item label="Madhya Pradesh" value="Madhya Pradesh" />
              <Picker.Item label="Punjab" value="Punjab" />
              <Picker.Item label="Uttarakhand" value="Uttarakhand" />
              <Picker.Item
                label="Uttar Pradesh(East)"
                value="Uttar Pradesh(East)"
              />
            </Picker>

            <Picker
              selectedValue={meta.District}
              onValueChange={(v) => setMeta({ ...meta, District: v })}
            >
              {districts.map((district) => (
                <Picker.Item
                  key={district.dt_name}
                  label={district.dt_name}
                  value={district.dt_name}
                />
              ))}
            </Picker>

            <Picker
              selectedValue={meta.Block}
              onValueChange={(v) => setMeta({ ...meta, Block: v })}
            >
              {blocks.map((block) => (
                <Picker.Item
                  key={block.blk_name}
                  label={block.blk_name}
                  value={block.blk_name}
                />
              ))}
            </Picker>

            <Picker
              selectedValue={meta.Ring}
              onValueChange={(v) => setMeta({ ...meta, Ring: v })}
            >
              <Picker.Item label="R1" value="R1" />
              <Picker.Item label="R2" value="R2" />
              <Picker.Item label="R3" value="R3" />
              <Picker.Item label="R4" value="R4" />
              <Picker.Item label="R5" value="R5" />
              <Picker.Item label="R6" value="R6" />
              <Picker.Item label="R7" value="R7" />
              <Picker.Item label="R8" value="R8" />
              <Picker.Item label="R9" value="R9" />
              <Picker.Item label="R10" value="R10" />
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Child Ring"
              value={meta.ChildRing}
              onChangeText={(t) => setMeta({ ...meta, ChildRing: t })}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                color="gray"
                onPress={() => setShowDialog(false)}
              />
              <Button title="Start" onPress={handleDialogStart} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
  },
  text: {
    fontSize: 18,
    marginTop: 6,
  },
  error: {
    color: "red",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "85%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
});

export default LocationScreen;
