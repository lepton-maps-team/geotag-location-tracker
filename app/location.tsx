import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";

import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RecordingView from "./components/RecordingView";

type LocationData = {
  Latitude: number;
  Longitude: number;
  Accuracy: number | null;
  Timestamp: number;
};

type SessionMeta = {
  videoName: string;
  blockName: string;
  route: string;
  entity: string;
  childRing: string;
  videoPath?: string | null;
  recordedAt?: number; // Timestamp when recording started
};

type RecordingSession = {
  meta: SessionMeta;
  //path: LocationData[];
  uploaded?: boolean;
  videoUri?: string | null;
  pathFile?: string | null;
};

const STORAGE_KEY = "RECORDINGS";

const LocationScreen: React.FC = () => {
  const router = useRouter();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [path, setPath] = useState<LocationData[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null
  );
  const [meta, setMeta] = useState<SessionMeta>({
    videoName: "",
    blockName: "",
    route: "",
    entity: "",
    childRing: "",
    videoPath: null,
  });
  const [showDialog, setShowDialog] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchablePicker, setSearchablePicker] = useState<{
    field: "Entity" | null;
    searchQuery: string;
  }>({ field: null, searchQuery: "" });
  const [showRoutePicker, setShowRoutePicker] = useState<boolean>(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermissions] =
    useMicrophonePermissions();

  const ensureLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        const message =
          "Location permission is required to record a session. Please enable it in your device settings.";
        setErrorMsg(message);
        Alert.alert("Permission required", message);
        return false;
      }

      setErrorMsg(null);
      return true;
    } catch (error) {
      console.error("Error requesting location permission:", error);
      const message = "Could not request location permission.";
      setErrorMsg(message);
      Alert.alert("Error", message);
      return false;
    }
  };

  const ensureCameraPermission = async () => {
    try {
      const response = await requestCameraPermission();

      if (!response || response.status !== "granted") {
        const message =
          "Camera permission is required to record video with your session. Please enable it in your device settings.";
        setErrorMsg(message);
        Alert.alert("Permission required", message);
        return false;
      }

      const micResponse = await requestMicrophonePermissions();

      if (!micResponse || micResponse.status !== "granted") {
        const message =
          "Microphone permission is required to record audio with your video. Please enable it in your device settings.";
        setErrorMsg(message);
        Alert.alert("Permission required", message);
        return false;
      }

      setErrorMsg(null);
      return true;
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      const message = "Could not request camera permission.";
      setErrorMsg(message);
      Alert.alert("Error", message);
      return false;
    }
  };

  const recordingSummary = useMemo(() => {
    if (!path.length) return "No points recorded yet.";
    const points = path.length;
    return `${points} point${
      points === 1 ? "" : "s"
    } captured in this session.`;
  }, [path.length]);

  const filteredOptions = useMemo(() => {
    if (!searchablePicker.field) return [];
    const query = searchablePicker.searchQuery.toLowerCase().trim();
    let options: string[] = [];

    if (searchablePicker.field === "Entity") {
      options = [
        "Cable",
        "Manhole",
        "PIT",
        "Splice Closure",
        "Trench-HDD",
        "Trench-Open",
      ];
    }

    if (!query) return options;
    return options.filter((opt) => opt.toLowerCase().includes(query));
  }, [searchablePicker.field, searchablePicker.searchQuery]);

  const handleStartPress = () => {
    setShowDialog(true);
  };

  const handleRecordingStop = async (
    finalPath: LocationData[],
    finalVideoUri: string | null
  ) => {
    setIsRecording(false);

    try {
      /* --------------------------------------------------
         1. Move video to app document directory
      -------------------------------------------------- */
      let shareableVideoUri: string | null = finalVideoUri;

      if (finalVideoUri) {
        try {
          const videosDir = FileSystem.documentDirectory + "videos/";
          const info = await FileSystem.getInfoAsync(videosDir);

          if (!info.exists) {
            await FileSystem.makeDirectoryAsync(videosDir, {
              intermediates: true,
            });
          }

          const fileName = finalVideoUri.split("/").pop();
          const dest = videosDir + fileName;

          await FileSystem.moveAsync({
            from: finalVideoUri,
            to: dest,
          });

          shareableVideoUri = dest;
        } catch (fsError) {
          console.error("Video move failed:", fsError);
          // Keep original URI as fallback
          shareableVideoUri = finalVideoUri;
        }
      }

      /* --------------------------------------------------
         2. Save GPS path as FILE (NOT AsyncStorage)
      -------------------------------------------------- */
      const pathsDir = FileSystem.documentDirectory + "paths/";
      await FileSystem.makeDirectoryAsync(pathsDir, {
        intermediates: true,
      });

      const pathFileName = `path_${Date.now()}.json`;
      const pathFileUri = pathsDir + pathFileName;

      await FileSystem.writeAsStringAsync(
        pathFileUri,
        JSON.stringify(finalPath)
      );

      /* --------------------------------------------------
         3. Load existing sessions SAFELY
      -------------------------------------------------- */
      let oldSessions: RecordingSession[] = [];

      try {
        const existing = await AsyncStorage.getItem(STORAGE_KEY);
        if (existing) {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            oldSessions = parsed;
          }
        }
      } catch (parseError) {
        console.error("Corrupted STORAGE_KEY, resetting:", parseError);
        oldSessions = [];
        await AsyncStorage.removeItem(STORAGE_KEY);
      }

      /* --------------------------------------------------
         4. Create new session (SMALL JSON ONLY)
      -------------------------------------------------- */
      const newSession: RecordingSession = {
        meta: {
          ...meta,
          videoPath: shareableVideoUri,
          recordedAt: recordingStartTime || Date.now(),
        },
        pathFile: pathFileUri, // 🔥 reference, not data
        uploaded: false,
        videoUri: shareableVideoUri,
      };

      /* --------------------------------------------------
         5. Save updated session list
      -------------------------------------------------- */
      const updatedSessions = [...oldSessions, newSession];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));

      /* --------------------------------------------------
         6. Cleanup + navigate
      -------------------------------------------------- */
      setRecordingStartTime(null);
      router.replace("/");
    } catch (error) {
      console.error("Error saving recording session:", error);
      Alert.alert("Error", "Could not save recording data.");
      setRecordingStartTime(null);
    }
  };

  // const handleRecordingStop = async (
  //   finalPath: LocationData[],
  //   finalVideoUri: string | null
  // ) => {
  //   setIsRecording(false);

  //   try {
  //     // --- MOVE VIDEO TO DOCUMENT DIRECTORY (SHAREABLE) ---
  //     let shareableVideoUri = finalVideoUri;
  //     if (finalVideoUri) {
  //       try {
  //         const videosDir = FileSystem.documentDirectory + "videos/";
  //         const info = await FileSystem.getInfoAsync(videosDir);

  //         if (!info.exists) {
  //           await FileSystem.makeDirectoryAsync(videosDir, {
  //             intermediates: true,
  //           });
  //         }

  //         const fileName = finalVideoUri.split("/").pop();
  //         const dest = videosDir + fileName;

  //         await FileSystem.moveAsync({
  //           from: finalVideoUri,
  //           to: dest,
  //         });

  //         shareableVideoUri = dest;
  //       } catch (fsError) {
  //         console.error("Error while checking/saving video file:", fsError);
  //       }
  //     }

  //     // --- SAVE METADATA + VIDEO PATH ---
  //     const existing = await AsyncStorage.getItem(STORAGE_KEY);
  //     const oldSessions: RecordingSession[] = existing
  //       ? JSON.parse(existing)
  //       : [];

  //     const newSession: RecordingSession = {
  //       meta: {
  //         ...meta,
  //         videoPath: shareableVideoUri ?? null,
  //         recordedAt: recordingStartTime || Date.now(), // Store recording start time
  //       },
  //       path: finalPath,
  //       uploaded: false,
  //       videoUri: shareableVideoUri,
  //     };

  //     const updated = [...oldSessions, newSession];
  //     await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  //     // Reset recording start time
  //     setRecordingStartTime(null);

  //     // Navigate to home screen after saving
  //     router.replace("/");
  //   } catch (error) {
  //     console.error("Error saving data:", error);
  //     Alert.alert("Error", "Could not save location data.");
  //   } finally {
  //     setRecordingStartTime(null);
  //   }
  // };

  const startRecording = () => {
    setShowDialog(false);
    setErrorMsg(null);
    setIsRecording(true);
    setPath([]);
    setLocation(null);
    setRecordingStartTime(Date.now()); // Store when recording started
  };

  const handleDialogStart = async () => {
    const trimmedName = meta.videoName?.trim() || "";

    if (!trimmedName) {
      Alert.alert("Missing info", "Please fill the Name field.");
      return;
    }
    const hasLocationPermission = await ensureLocationPermission();
    if (!hasLocationPermission) {
      return;
    }

    const hasCameraPermission = await ensureCameraPermission();
    if (!hasCameraPermission) {
      return;
    }
    startRecording();
  };

  // Show recording view
  if (isRecording) {
    return (
      <RecordingView
        onStop={(finalPath, finalVideoUri) =>
          handleRecordingStop(finalPath, finalVideoUri)
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* METADATA MODAL */}
      <Modal visible={showDialog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalBox}>
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.modalTitle}>Session details</Text>
                <Text style={styles.modalSubtitle}>
                  Provide metadata before recording.
                </Text>

                {/* Session Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Videos name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Field Survey"
                    placeholderTextColor="#94a3b8"
                    value={meta.videoName}
                    onChangeText={(t) =>
                      setMeta({ ...meta, videoName: t.trimStart() })
                    }
                  />
                </View>

                {/* BLOCK NAME - INPUT */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Block name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter block name"
                    placeholderTextColor="#94a3b8"
                    value={meta.blockName}
                    onChangeText={(t) => setMeta({ ...meta, blockName: t })}
                  />
                </View>

                {/* ROUTE - PICKER */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Route</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() => setShowRoutePicker(true)}
                  >
                    <Text style={styles.pickerText}>
                      {meta.route || "Select route"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ENTITY - SEARCHABLE */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Entity</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({ field: "Entity", searchQuery: "" })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {meta.entity || "Select entity"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* CHILD RING */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Child ring</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional"
                    placeholderTextColor="#94a3b8"
                    value={meta.childRing}
                    onChangeText={(t) => setMeta({ ...meta, childRing: t })}
                  />
                </View>

                {/* BUTTONS */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonGhost]}
                    onPress={() => router.back()}
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
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Searchable Picker Modal */}
      <Modal
        visible={searchablePicker.field !== null}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSearchablePicker({ field: null, searchQuery: "" })
        }
      >
        <View style={styles.searchableModalOverlay}>
          <View style={styles.searchableModalBox}>
            <Text style={styles.searchableModalTitle}>
              Select {searchablePicker.field}
            </Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#94a3b8"
              value={searchablePicker.searchQuery}
              onChangeText={(text) =>
                setSearchablePicker({
                  ...searchablePicker,
                  searchQuery: text,
                })
              }
              autoFocus
            />
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              style={styles.searchableList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchableItem}
                  onPress={() => {
                    if (searchablePicker.field === "Entity") {
                      setMeta({ ...meta, entity: item });
                    }
                    setSearchablePicker({ field: null, searchQuery: "" });
                  }}
                >
                  <Text style={styles.searchableItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.searchableEmpty}>
                  <Text style={styles.searchableEmptyText}>
                    No results found
                  </Text>
                </View>
              }
            />
            <TouchableOpacity
              style={styles.searchableModalCancelButton}
              onPress={() =>
                setSearchablePicker({ field: null, searchQuery: "" })
              }
            >
              <Text style={styles.searchableModalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Route Picker Modal */}
      <Modal
        visible={showRoutePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoutePicker(false)}
      >
        <View style={styles.searchableModalOverlay}>
          <View style={styles.searchableModalBox}>
            <Text style={styles.searchableModalTitle}>Select Route</Text>
            <FlatList
              data={["route1", "test", "RouteToGP2"]}
              keyExtractor={(item) => item}
              style={styles.searchableList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchableItem}
                  onPress={() => {
                    setMeta({ ...meta, route: item });
                    setShowRoutePicker(false);
                  }}
                >
                  <Text style={styles.searchableItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.searchableModalCancelButton}
              onPress={() => setShowRoutePicker(false)}
            >
              <Text style={styles.searchableModalCancelButtonText}>Close</Text>
            </TouchableOpacity>
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
  recordingContainer: {
    flex: 1,
  },
  recordingContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 20,
  },
  recordingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.15)",
  },
  recordingStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#f87171",
  },
  recordingStatusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fca5a5",
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  recordingCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  recordingCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  recordingMetrics: {
    gap: 12,
  },
  recordingMetricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recordingMetricLabel: {
    fontSize: 14,
    color: "#94a3b8",
  },
  recordingMetricValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#38bdf8",
  },
  recordingPlaceholder: {
    fontSize: 15,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  recordingPointsCount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#38bdf8",
  },
  stopRecordingButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#b91c1c",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    marginTop: 20,
  },
  stopRecordingButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
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
  keyboardAvoidingView: {
    width: "100%",
    maxHeight: "90%",
  },
  modalBox: {
    backgroundColor: "#222222",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.25)",
    overflow: "hidden",
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 24,
    gap: 16,
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
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#141414",
    justifyContent: "center",
  },
  pickerText: {
    color: "white",
    fontSize: 16,
  },
  dropdownItem: {
    padding: 10,
    marginTop: 2,
    backgroundColor: "#141414",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
  },
  searchableModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  searchableModalBox: {
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.25)",
  },
  searchableModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#f8fafc",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  searchableList: {
    maxHeight: 300,
  },
  searchableItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  searchableItemText: {
    color: "#f8fafc",
    fontSize: 16,
  },
  searchableEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  searchableEmptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  searchableModalCancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  searchableModalCancelButtonText: {
    color: "#cbd5f5",
    fontSize: 15,
    fontWeight: "600",
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
  cameraOverlay: {
    position: "absolute",
    bottom: 40,
    right: 20,
    width: 140,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.8)",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  cameraTimestamp: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  cameraTimestampText: {
    color: "#fefce8",
    fontSize: 12,
    fontWeight: "600",
  },
});

const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(minutes)}:${pad(seconds)}`;
};

export default LocationScreen;
