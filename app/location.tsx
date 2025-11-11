import { blocks, districts, states } from "@/constants/lists";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
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
    return `${points} point${
      points === 1 ? "" : "s"
    } captured in this session.`;
  }, [path.length]);

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

      const newSession: RecordingSession = { meta, path, uploaded: false };
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Live Location Tracker</Text>
            <Text style={styles.heroSubtitle}>
              Capture GPS points with rich metadata to build precise field
              sessions.
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

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

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
                <Text style={styles.metricLabel}>Accuracy (m)</Text>
                <Text style={styles.metricValue}>
                  {location.Accuracy ?? "—"}
                </Text>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session summary</Text>
          <Text style={styles.summaryText}>{recordingSummary}</Text>
        </View>

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
              <Text style={styles.primaryButtonText}>Stop &amp; save</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={showDialog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Session details</Text>
            <Text style={styles.modalSubtitle}>
              Provide the contextual metadata to tag this recording.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Session name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sample Village Visit"
                placeholderTextColor="#94a3b8"
                value={meta.Name}
                onChangeText={(t) => setMeta({ ...meta, Name: t })}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>State *</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={meta.State}
                  onValueChange={(v) => setMeta({ ...meta, State: v })}
                  dropdownIconColor="#e2e8f0"
                  style={styles.picker}
                >
                  <Picker.Item label="Select state" value="" />
                  {states.map((state) => (
                    <Picker.Item key={state} label={state} value={state} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>District *</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={meta.District}
                  onValueChange={(v) => setMeta({ ...meta, District: v })}
                  dropdownIconColor="#e2e8f0"
                  style={styles.picker}
                >
                  <Picker.Item label="Select district" value="" />
                  {districts.map((district) => (
                    <Picker.Item
                      key={district}
                      label={district}
                      value={district}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Block</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={meta.Block}
                  onValueChange={(v) => setMeta({ ...meta, Block: v })}
                  dropdownIconColor="#e2e8f0"
                  style={styles.picker}
                >
                  <Picker.Item label="Select block" value="" />
                  {blocks.map((block) => (
                    <Picker.Item key={block} label={block} value={block} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Ring</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={meta.Ring}
                  onValueChange={(v) => setMeta({ ...meta, Ring: v })}
                  dropdownIconColor="#e2e8f0"
                  style={styles.picker}
                >
                  <Picker.Item label="Select ring" value="" />
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
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Child ring</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional detail"
                placeholderTextColor="#94a3b8"
                value={meta.ChildRing}
                onChangeText={(t) => setMeta({ ...meta, ChildRing: t })}
              />
            </View>

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
    backgroundColor: "#2563eb",
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
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    backgroundColor: "rgba(15, 23, 42, 0.96)",
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
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: "#cbd5f5",
    letterSpacing: 0.4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#f8fafc",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  picker: {
    color: "#f8fafc",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#f8fafc",
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
