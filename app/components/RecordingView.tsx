import { CameraView } from "expo-camera";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type LocationData = {
  Latitude: number;
  Longitude: number;
  Accuracy: number | null;
  Timestamp: number;
};

type RecordingViewProps = {
  onStop: (path: LocationData[], videoUri: string | null) => void;
};

const RecordingView: React.FC<RecordingViewProps> = ({ onStop }) => {
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [path, setPath] = useState<LocationData[]>([]);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const cameraRef = useRef<CameraView | null>(null);
  const videoRecordingPromiseRef = useRef<Promise<any> | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const recordStartTimeRef = useRef<number | null>(null);
  const secondCounterRef = useRef<number>(0);
  const hasStoppedRef = useRef<boolean>(false);

  useEffect(() => {
    startRecording();
    return () => {
      // Only cleanup intervals, don't call stopRecording to avoid double save
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    };
  }, []);

  const handleCameraReady = () => {
    if (videoRecordingPromiseRef.current || isVideoRecording) return;
    if (!cameraRef.current) return;

    setIsVideoRecording(true);
    // Record in low quality to save space
    const recordingPromise = cameraRef.current.recordAsync({});
    videoRecordingPromiseRef.current = recordingPromise;

    recordingPromise
      .then((video: any) => {
        if (video?.uri) {
          console.log("Video recorded:", video.uri);
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

  const startRecording = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Location permission not granted");
        return;
      }

      // Start location tracking
      recordStartTimeRef.current = Date.now();
      secondCounterRef.current = 0;

      // Capture location immediately (second 1)
      captureLocation();

      // Then capture every second
      locationIntervalRef.current = setInterval(captureLocation, 1000);

      // Update elapsed time
      elapsedIntervalRef.current = setInterval(() => {
        if (recordStartTimeRef.current) {
          setRecordElapsed(
            Math.floor((Date.now() - recordStartTimeRef.current) / 1000)
          );
        }
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const captureLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      secondCounterRef.current += 1;
      const locationData: LocationData = {
        Latitude: loc.coords.latitude,
        Longitude: loc.coords.longitude,
        Accuracy: loc.coords.accuracy,
        Timestamp: secondCounterRef.current,
      };

      setPath((prev) => {
        const updated = [...prev, locationData];
        setLocation(locationData);
        return updated;
      });
    } catch (error) {
      console.error("Error capturing location:", error);
    }
  };

  const stopRecording = async () => {
    // Prevent calling onStop multiple times
    if (hasStoppedRef.current) {
      return;
    }
    hasStoppedRef.current = true;

    // Stop location interval
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    // Stop elapsed time interval
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    // Stop video recording - use the same code as before
    let finalVideoUri: string | null = null;
    try {
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
    } catch (error) {
      console.error("Error stopping video:", error);
    }

    // Call onStop with final data (only once)
    onStop(path, finalVideoUri);
  };

  const formatDuration = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <View style={styles.container}>
      {/* Full screen video */}
      <CameraView
        mode="video"
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={handleCameraReady}
        videoQuality="720p"
        videoBitrate={3_500_000}
      />

      {/* Location overlay - top right */}
      {location && (
        <View style={styles.locationOverlay}>
          <Text style={styles.locationTitle}>Location</Text>
          <Text style={styles.locationText}>
            Lat: {location.Latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {location.Longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Acc:{" "}
            {location.Accuracy ? `${location.Accuracy.toFixed(1)}m` : "N/A"}
          </Text>
          <Text style={styles.locationText}>
            Time: {formatDuration(recordElapsed)}
          </Text>
          <Text style={styles.locationText}>Points: {path.length}</Text>
        </View>
      )}

      {/* Stop button */}
      <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
        <Text style={styles.stopButtonText}>Stop & Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  locationOverlay: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 12,
    minWidth: 180,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  locationTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  locationText: {
    color: "#e2e8f0",
    fontSize: 11,
    marginBottom: 4,
    fontFamily: "monospace",
  },
  stopButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
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
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});

export default RecordingView;
