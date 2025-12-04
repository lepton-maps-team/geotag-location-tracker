import { blocks, districts, states } from "@/constants/lists";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  VideoPath?: string | null;
};

type RecordingSession = {
  meta: SessionMeta;
  path: LocationData[];
  uploaded?: boolean;
  videoUri?: string | null;
};

const STORAGE_KEY = "RECORDINGS";
const LOCATION_TRACKING_TASK = "location-tracking-task";
const CURRENT_SESSION_LOCATIONS_KEY = "CURRENT_SESSION_LOCATIONS";

// Define the background location tracking task
TaskManager.defineTask(
  LOCATION_TRACKING_TASK,
  async ({ data, error }: { data: any; error: any }) => {
    if (error) {
      console.error("Location task error:", error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };

      // Process and store location data
      if (locations && locations.length > 0) {
        try {
          // Get existing locations for current session
          const existingData = await AsyncStorage.getItem(
            CURRENT_SESSION_LOCATIONS_KEY
          );
          const existingLocations: LocationData[] = existingData
            ? JSON.parse(existingData)
            : [];

          // Convert LocationObject to LocationData format
          const newLocations: LocationData[] = locations.map((loc) => ({
            Latitude: loc.coords.latitude,
            Longitude: loc.coords.longitude,
            Accuracy: loc.coords.accuracy,
            Timestamp: loc.timestamp,
          }));

          // Append new locations
          const updatedLocations = [...existingLocations, ...newLocations];

          // Store back to AsyncStorage
          await AsyncStorage.setItem(
            CURRENT_SESSION_LOCATIONS_KEY,
            JSON.stringify(updatedLocations)
          );

          console.log(
            `Received ${locations.length} background location update(s), total: ${updatedLocations.length}`
          );
        } catch (storageError) {
          console.error("Error storing location data:", storageError);
        }
      }
    }
  }
);

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
    VideoPath: null,
  });
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchablePicker, setSearchablePicker] = useState<{
    field: "State" | "District" | "Block" | "Ring" | null;
    searchQuery: string;
  }>({ field: null, searchQuery: "" });

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermissions] =
    useMicrophonePermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const videoRecordingPromiseRef = useRef<Promise<any> | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recordStartTime, setRecordStartTime] = useState<number | null>(null);
  const [recordElapsed, setRecordElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording || recordStartTime == null) {
      setRecordElapsed(0);
      return;
    }

    const intervalId = setInterval(() => {
      setRecordElapsed(Math.floor((Date.now() - recordStartTime) / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRecording, recordStartTime]);

  // Read location updates from AsyncStorage when recording
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const readLocations = async () => {
      try {
        const data = await AsyncStorage.getItem(CURRENT_SESSION_LOCATIONS_KEY);
        if (data) {
          const locations: LocationData[] = JSON.parse(data);
          if (locations.length > 0) {
            setPath(locations);
            // Update current location to the latest one
            setLocation(locations[locations.length - 1]);
          }
        }
      } catch (error) {
        console.error("Error reading location data:", error);
      }
    };

    // Read immediately and then every 1 second to sync with video
    readLocations();
    const intervalId = setInterval(readLocations, 1000);

    return () => clearInterval(intervalId);
  }, [isRecording]);

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

  const handleCameraReady = () => {
    if (videoRecordingPromiseRef.current || isVideoRecording) return;
    if (!cameraRef.current) return;

    setIsVideoRecording(true);
    const recordingPromise = cameraRef.current.recordAsync();
    videoRecordingPromiseRef.current = recordingPromise;

    recordingPromise
      .then((video: any) => {
        if (video?.uri) {
          setVideoUri(video.uri);
        }
      })
      .catch((err: any) => {
        console.error("Video recording error:", err);
      })
      .finally(() => {
        setIsVideoRecording(false);
        videoRecordingPromiseRef.current = null;
      });
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

    if (searchablePicker.field === "State") {
      options = states;
    } else if (searchablePicker.field === "District") {
      options = districts;
    } else if (searchablePicker.field === "Block") {
      options = blocks;
    } else if (searchablePicker.field === "Ring") {
      options = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"];
    }

    if (!query) return options;
    return options.filter((opt) => opt.toLowerCase().includes(query));
  }, [searchablePicker.field, searchablePicker.searchQuery]);

  const handleStartPress = () => {
    setShowDialog(true);
  };

  const startRecording = async () => {
    setShowDialog(false);
    setErrorMsg(null);
    setIsRecording(true);
    setPath([]);
    setLocation(null);
    setRecordStartTime(Date.now());

    // Clear previous session locations
    await AsyncStorage.removeItem(CURRENT_SESSION_LOCATIONS_KEY);

    // Start background location tracking
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TRACKING_TASK
      );
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every 1 second to sync with video
          foregroundService: {
            notificationTitle: "Location Tracking",
            notificationBody: "Recording your location in the background",
          },
        });
        console.log("Background location tracking started");
      }
    } catch (error) {
      console.error("Error starting location tracking:", error);
      setErrorMsg("Failed to start location tracking");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setRecordStartTime(null);

    // Stop background location tracking
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TRACKING_TASK
      );
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        console.log("Background location tracking stopped");
      }
    } catch (error) {
      console.error("Error stopping location tracking:", error);
    }

    // Read final locations from storage
    let finalPath: LocationData[] = [];
    try {
      const data = await AsyncStorage.getItem(CURRENT_SESSION_LOCATIONS_KEY);
      if (data) {
        finalPath = JSON.parse(data);
        setPath(finalPath);
        if (finalPath.length > 0) {
          setLocation(finalPath[finalPath.length - 1]);
        }
      }
    } catch (error) {
      console.error("Error reading final location data:", error);
      finalPath = path; // Fallback to current path state
    }

    // Clear temp storage
    await AsyncStorage.removeItem(CURRENT_SESSION_LOCATIONS_KEY);

    try {
      let finalVideoUri: string | null = videoUri;

      // --- STOP RECORDING SAFELY ---
      try {
        if (
          cameraRef.current &&
          isVideoRecording &&
          videoRecordingPromiseRef.current
        ) {
          console.log("stopping recording");
          cameraRef.current.stopRecording();
        }

        if (videoRecordingPromiseRef.current) {
          const video = await videoRecordingPromiseRef.current;

          if (video?.uri) {
            finalVideoUri = video.uri; // raw Expo Go cache path
            setVideoUri(video.uri);
          }
        }
      } catch (videoError: any) {
        const message = String(videoError?.message ?? videoError);
        if (
          !message.includes(
            "Recording was stopped before any data could be produced"
          )
        ) {
          console.error("Error stopping video recording:", videoError);
        }
      } finally {
        setIsVideoRecording(false);
        videoRecordingPromiseRef.current = null;
      }

      // --- MOVE VIDEO TO DOCUMENT DIRECTORY (SHAREABLE) ---
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

          // 🔥 CRITICAL FIX — update finalVideoUri so later sharing works
          finalVideoUri = dest;

          setVideoUri(dest);
        } catch (fsError) {
          console.error("Error while checking/saving video file:", fsError);
        }
      }

      // --- SAVE METADATA + VIDEO PATH ---
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const oldSessions: RecordingSession[] = existing
        ? JSON.parse(existing)
        : [];

      const newSession: RecordingSession = {
        meta: {
          ...meta,
          VideoPath: finalVideoUri ?? null, // 🔥 use updated shareable path
        },
        path: finalPath,
        uploaded: false,
        videoUri: finalVideoUri, // 🔥 save correct shareable URI
      };

      const updated = [...oldSessions, newSession];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      Alert.alert(
        "Recording Saved",
        `Saved ${finalPath.length} points for ${meta.Name || "Unnamed"}`
      );
    } catch (error) {
      console.error("Error saving data:", error);
      Alert.alert("Error", "Could not save location data.");
    }
  };

  const handleDialogStart = async () => {
    const trimmedName = meta.Name?.trim() || "";
    const trimmedState = meta.State?.trim() || "";
    const trimmedDistrict = meta.District?.trim() || "";

    if (!trimmedName || !trimmedState || !trimmedDistrict) {
      Alert.alert("Missing info", "Please fill Name, State, and District.");
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.recordingContainer}>
          <ScrollView
            contentContainerStyle={styles.recordingContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Recording Header */}
            <View style={styles.recordingHeader}>
              <View style={styles.recordingStatus}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingStatusText}>Recording</Text>
              </View>
              <Text style={styles.recordingTime}>
                {recordElapsed > 0 ? formatDuration(recordElapsed) : "00:00"}
              </Text>
            </View>

            {/* Location Info */}
            <View style={styles.recordingCard}>
              <Text style={styles.recordingCardTitle}>Location Tracking</Text>
              {location ? (
                <View style={styles.recordingMetrics}>
                  <View style={styles.recordingMetricRow}>
                    <Text style={styles.recordingMetricLabel}>Latitude:</Text>
                    <Text style={styles.recordingMetricValue}>
                      {location.Latitude.toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.recordingMetricRow}>
                    <Text style={styles.recordingMetricLabel}>Longitude:</Text>
                    <Text style={styles.recordingMetricValue}>
                      {location.Longitude.toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.recordingMetricRow}>
                    <Text style={styles.recordingMetricLabel}>Accuracy:</Text>
                    <Text style={styles.recordingMetricValue}>
                      {location.Accuracy
                        ? `${location.Accuracy.toFixed(1)}m`
                        : "N/A"}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.recordingPlaceholder}>
                  Waiting for location updates...
                </Text>
              )}
            </View>

            {/* Points Count */}
            <View style={styles.recordingCard}>
              <Text style={styles.recordingCardTitle}>Points Captured</Text>
              <Text style={styles.recordingPointsCount}>
                {path.length} point{path.length === 1 ? "" : "s"}
              </Text>
            </View>

            {/* Stop Button */}
            <TouchableOpacity
              style={styles.stopRecordingButton}
              onPress={stopRecording}
            >
              <Text style={styles.stopRecordingButtonText}>Stop & Save</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Camera Overlay */}
          <View style={styles.cameraOverlay}>
            <CameraView
              mode="video"
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              onCameraReady={handleCameraReady}
            />

            <View style={styles.cameraTimestamp}>
              <Text style={styles.cameraTimestampText}>
                {recordElapsed > 0 ? formatDuration(recordElapsed) : "00:00"}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
                  <Text style={styles.inputLabel}>Session name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Field Survey"
                    placeholderTextColor="#94a3b8"
                    value={meta.Name}
                    onChangeText={(t) =>
                      setMeta({ ...meta, Name: t.trimStart() })
                    }
                  />
                </View>

                {/* STATE - SEARCHABLE */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({ field: "State", searchQuery: "" })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {meta.State || "Select state"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* DISTRICT - SEARCHABLE */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>District *</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({
                        field: "District",
                        searchQuery: "",
                      })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {meta.District || "Select district"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* BLOCK - SEARCHABLE */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Block</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({ field: "Block", searchQuery: "" })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {meta.Block || "Select block"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* RING - SEARCHABLE */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Ring</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({ field: "Ring", searchQuery: "" })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {meta.Ring || "Select ring"}
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
                    if (searchablePicker.field === "State") {
                      setMeta({ ...meta, State: item });
                    } else if (searchablePicker.field === "District") {
                      setMeta({ ...meta, District: item });
                    } else if (searchablePicker.field === "Block") {
                      setMeta({ ...meta, Block: item });
                    } else if (searchablePicker.field === "Ring") {
                      setMeta({ ...meta, Ring: item });
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
