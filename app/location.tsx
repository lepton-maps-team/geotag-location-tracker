import { blocks, districts, states } from "@/constants/lists";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SearchableDropdown from "react-native-searchable-dropdown";
import * as Location from "expo-location";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  uploaded?: boolean;
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

  const recordingSummary = useMemo(() => {
    if (!path.length) return "No points recorded yet.";
    const points = path.length;
    return `${points} point${points === 1 ? "" : "s"} captured in this session.`;
  }, [path.length]);

  const handleStartPress = () => {
    setShowDialog(true);
  };

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
        timeInterval: 0,
      },
      (loc: Location.LocationObject) => {
        setPath((prev) => {
          const nextTimestamp = prev.length + 1;
          const data: LocationData = {
            Latitude: parseFloat(loc.coords.latitude.toFixed(6)),
            Longitude: parseFloat(loc.coords.longitude.toFixed(6)),
            Accuracy: loc.coords.accuracy ?? null,
            Timestamp: nextTimestamp,
          };
          setLocation(data);
          return [...prev, data];
        });
      },
    );

    setSubscription(sub);
  };

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

      const newSession: RecordingSession = { meta, path, uploaded: false };
      const updated = [...oldSessions, newSession];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      Alert.alert(
        "Recording Saved",
        `Saved ${path.length} points for ${meta.Name || "Unnamed"}`,
      );
    } catch (error) {
      console.error("Error saving data:", error);
      Alert.alert("Error", "Could not save location data.");
    }
  };

  const handleDialogStart = () => {
    if (!meta.Name || !meta.State || !meta.District) {
      Alert.alert("Missing info", "Please fill Name, State, and District.");
      return;
    }
    startRecording();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Live Location Tracker</Text>
            <Text style={styles.heroSubtitle}>
              Capture GPS points with rich metadata.
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              isRecording ? styles.statusRecording : styles.statusIdle,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isRecording ? styles.statusDotActive : styles.statusDotIdle,
              ]}
            />
            <Text
              style={[styles.statusText, !isRecording && styles.statusTextIdle]}
            >
              {isRecording ? "Recording in progress" : "Idle"}
            </Text>
          </View>
        </View>

        {/* ERROR */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* CURRENT LOCATION CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current position</Text>
          {location ? (
            <View style={styles.metricGrid}>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Latitude</Text>
                <Text style={styles.metricValue}>{location.Latitude}</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Longitude</Text>
                <Text style={styles.metricValue}>{location.Longitude}</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Accuracy</Text>
                <Text style={styles.metricValue}>{location.Accuracy}</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Timestamp</Text>
                <Text style={styles.metricValue}>{location.Timestamp}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.placeholder}>Waiting for location...</Text>
          )}
        </View>

        {/* SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session summary</Text>
          <Text style={styles.summaryText}>{recordingSummary}</Text>
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          {!isRecording ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartPress}
            >
              <Text style={styles.primaryButtonText}>Start new recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, styles.stopButton]}
              onPress={stopRecording}
            >
              <Text style={styles.primaryButtonText}>Stop & save</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* METADATA MODAL */}
      <Modal visible={showDialog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Session details</Text>
            <Text style={styles.modalSubtitle}>
              Provide metadata before recording.
            </Text>

            {/* Session Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Session name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Field Survey"
                placeholderTextColor="#94a3b8"
                value={meta.Name}
                onChangeText={(t) => setMeta({ ...meta, Name: t })}
              />
            </View>

            {/* STATE - SEARCHABLE */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>State *</Text>
              <SearchableDropdown
                items={states.map((s) => ({ id: s, name: s }))}
                defaultIndex={states.findIndex((s) => s === meta.State)}
                textInputProps={{
                  placeholder: "Select state",
                  value: meta.State, // <-- selected value shows here
                  onChangeText: () => {},
                }}
                value={meta.State}
                onItemSelect={(item) => setMeta({ ...meta, State: item.name })}
                placeholder="Select state"
                textInputStyle={styles.input}
                itemTextStyle={{ color: "white" }}
                itemStyle={styles.dropdownItem}
                itemsContainerStyle={{ maxHeight: 180 }}
              />
            </View>

            {/* DISTRICT - SEARCHABLE */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>District *</Text>
              <SearchableDropdown
                items={districts.map((d) => ({ id: d, name: d }))}
                defaultIndex={districts.findIndex((s) => s === meta.District)}
                textInputProps={{
                  placeholder: "Select district",
                  value: meta.District, // <-- selected value shows here
                  onChangeText: () => {},
                }}
                onItemSelect={(item) =>
                  setMeta({ ...meta, District: item.name })
                }
                placeholder="Select district"
                textInputStyle={styles.input}
                itemTextStyle={{ color: "#fff" }}
                itemStyle={styles.dropdownItem}
                itemsContainerStyle={{ maxHeight: 180 }}
              />
            </View>

            {/* BLOCK - SEARCHABLE */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Block</Text>
              <SearchableDropdown
                items={blocks.map((b) => ({ id: b, name: b }))}
                defaultIndex={blocks.findIndex((b) => b === meta.Block)}
                textInputProps={{
                  placeholder: "Select block",
                  value: meta.Block, // <-- selected value shows here
                  onChangeText: () => {},
                }}
                onItemSelect={(item) => setMeta({ ...meta, Block: item.name })}
                placeholder="Select block"
                textInputStyle={styles.input}
                itemTextStyle={{ color: "#fff" }}
                itemStyle={styles.dropdownItem}
                itemsContainerStyle={{ maxHeight: 180 }}
              />
            </View>

            {/* RING - SEARCHABLE */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Ring</Text>
              <SearchableDropdown
                items={[
                  "R1",
                  "R2",
                  "R3",
                  "R4",
                  "R5",
                  "R6",
                  "R7",
                  "R8",
                  "R9",
                  "R10",
                ].map((r) => ({ id: r, name: r }))}
                textInputProps={{
                  placeholder: "Select ring",
                  value: meta.Ring, // <-- selected value shows here
                  onChangeText: () => {},
                }}
                onItemSelect={(item) => setMeta({ ...meta, Ring: item.name })}
                placeholder="Select ring"
                textInputStyle={styles.input}
                itemTextStyle={{ color: "#fff" }}
                itemStyle={styles.dropdownItem}
                itemsContainerStyle={{ maxHeight: 180 }}
              />
            </View>

            {/* CHILD RING */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Child ring</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor="#94a3b8"
                value={meta.ChildRing}
                onChangeText={(t) => setMeta({ ...meta, ChildRing: t })}
              />
            </View>

            {/* BUTTONS */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonGhost]}
                onPress={() => setShowDialog(false)}
              >
                <Text style={styles.modalButtonGhostText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleDialogStart}
              >
                <Text style={styles.modalButtonText}>Start recording</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 20,
  },
  hero: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 20,
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.15)",
  },
  heroCopy: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: "#94a3b8",
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusRecording: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  statusIdle: {
    backgroundColor: "rgba(94, 234, 212, 0.12)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: "#f87171",
  },
  statusDotIdle: {
    backgroundColor: "#22d3ee",
  },
  statusText: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  statusTextIdle: {
    color: "#5eead4",
  },
  errorBanner: {
    backgroundColor: "rgba(248, 113, 113, 0.18)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
    padding: 14,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  metricCell: {
    width: "48%",
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#38bdf8",
  },
  placeholder: {
    fontSize: 15,
    color: "#94a3b8",
  },
  summaryText: {
    fontSize: 15,
    color: "#cbd5f5",
    lineHeight: 22,
  },
  actions: {
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  stopButton: {
    backgroundColor: "#ef4444",
    shadowColor: "#b91c1c",
  },
  primaryButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    backgroundColor: "#222222",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.25)",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
  },
  fieldGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: "#cbd5f5",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "white",
    backgroundColor: "#141414",
  },
  dropdownItem: {
    padding: 10,
    marginTop: 2,
    backgroundColor: "#141414",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "black",
    fontSize: 15,
    fontWeight: "600",
  },
  modalButtonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  modalButtonGhostText: {
    color: "#cbd5f5",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default LocationScreen;
