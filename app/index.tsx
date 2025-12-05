import { supabase } from "@/lib/supabase";
import { uploadVideoWithFileSystem } from "@/lib/video-upload";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HomeScreen = () => {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [savingVideoIndex, setSavingVideoIndex] = useState<number | null>(null);
  const [savingTrackIndex, setSavingTrackIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("user");
      router.replace("/auth");
    } catch (error) {
      console.error("Failed to log out:", error);
      Alert.alert("Logout failed", "Please try again.");
    }
  }, [router]);

  const handleUpload = useCallback(
    async (record: any, index: number) => {
      if (record?.uploaded) {
        Alert.alert(
          "Already uploaded",
          "This session has already been uploaded to Supabase."
        );
        return;
      }

      try {
        setUploadingIndex(index);
        setShowUploadDialog(true);
        setUploadStatus("Preparing upload...");

        const storedUser = await AsyncStorage.getItem("user");
        const user = JSON.parse(storedUser as string);
        const track = record.path;

        // Upload GPS track
        setUploadStatus("Uploading GPS track...");
        const { data, error } = await supabase
          .from("gps_tracks")
          .insert({
            name: record?.meta?.Name,
            location_data: track,
            timestamp: Date.now(),
            duration: track[track.length - 1].Timestamp - track[0].Timestamp,
            route_id: "",
            entity_id: "",
            depth_data: [],
          })
          .select()
          .single();
        if (error) {
          throw error;
        }

        // Upload survey metadata
        setUploadStatus("Saving survey data...");
        const surveyData = await supabase
          .from("surveys")
          .insert({
            name: record?.meta?.Name,
            gps_track_id: data.id,
            timestamp: Date.now(),
            user_id: user.id,
            state: record?.meta?.State,
            district: record?.meta?.District,
            block: record?.meta?.Block,
            ring: record?.meta?.Ring,
            child_ring: record?.meta?.ChildRing,
          })
          .select()
          .single();

        if (surveyData.error) {
          throw surveyData.error;
        }

        // Upload video if available
        if (record.videoUri) {
          setUploadStatus("Uploading video...");
          const videoMetadata = await uploadVideoWithFileSystem(
            record.videoUri,
            surveyData.data.id
          );

          console.log(videoMetadata.finalUrl, "videoMetadata.finalUrl");

          console.log("Video metadata:", videoMetadata);
        } else {
          setUploadStatus("No video to upload, skipping...");
        }

        // Update local storage
        setUploadStatus("Finalizing...");
        const updated = [...locations];
        updated[index] = { ...record, uploaded: true };
        setLocations(updated);
        await AsyncStorage.setItem("RECORDINGS", JSON.stringify(updated));

        // Close dialog and show success
        setShowUploadDialog(false);
        Alert.alert("Uploaded", `Uploaded ${data.name} successfully.`);
      } catch (error) {
        console.error("Failed to upload recording:", error);
        setShowUploadDialog(false);
        Alert.alert(
          "Upload failed",
          "We couldn't upload the file. Please try again."
        );
      } finally {
        setUploadingIndex(null);
        setUploadStatus("");
      }
    },
    [locations]
  );

  const handleSaveToDevice = useCallback(async (record: any, index: number) => {
    try {
      setSavingVideoIndex(index);

      if (!record.videoUri) {
        Alert.alert(
          "No video available",
          "This session does not have an associated video file."
        );
        return;
      }

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "Sharing is not available on this device."
        );
        return;
      }

      await Sharing.shareAsync(record.videoUri);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Failed to share video",
        error?.message || "Please try again."
      );
    } finally {
      setSavingVideoIndex(null);
    }
  }, []);

  const handleSaveToDevicePath = useCallback(
    async (record: any, index: number) => {
      try {
        setSavingTrackIndex(index);

        const track = record.path; // the array you want
        console.log("Track:", track);

        // Convert path array to readable text
        const trackText = JSON.stringify(track, null, 2);

        const randomId = Math.random().toString(36).substring(2, 10);
        const fileName = `${record?.meta?.Name || "path"}-${randomId}.txt`;

        const fileUri = FileSystem.documentDirectory + fileName;

        await FileSystem.writeAsStringAsync(fileUri, trackText);

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          alert("Sharing is not available on this device.");
          return false;
        }

        const result = await Sharing.shareAsync(fileUri);
        console.log("Shared:", result);

        return true;
      } catch (error: any) {
        console.error("Error saving path:", error);
        alert(`Error: ${error.message}`);
        return false;
      } finally {
        setSavingTrackIndex(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    (indexToRemove: number) => {
      Alert.alert(
        "Delete recording",
        "Are you sure you want to delete this recording?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                setDeletingIndex(indexToRemove);
                const updated = locations.filter(
                  (_, idx) => idx !== indexToRemove
                );
                setLocations(updated);
                await AsyncStorage.setItem(
                  "RECORDINGS",
                  JSON.stringify(updated)
                );
              } catch (error) {
                console.error("Failed to delete recording:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete recording. Please try again."
                );
              } finally {
                setDeletingIndex(null);
              }
            },
          },
        ]
      );
    },
    [locations]
  );

  // ✅ Auth check
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const verifyAuth = async () => {
        try {
          const storedUser = await AsyncStorage.getItem("user");
          if (!storedUser && isActive) {
            router.replace("/auth");
            return;
          }
        } catch (error) {
          console.error("Failed to verify auth state:", error);
          if (isActive) {
            router.replace("/auth");
          }
        } finally {
          if (isActive) {
            setCheckingAuth(false);
          }
        }
      };

      verifyAuth();

      return () => {
        isActive = false;
      };
    }, [router])
  );

  // ✅ Fetch stored locations
  useFocusEffect(
    useCallback(() => {
      const fetchLocations = async () => {
        const storedLocations = await AsyncStorage.getItem("RECORDINGS");
        const parsed: any = storedLocations ? JSON.parse(storedLocations) : [];
        const normalized = parsed.map((entry: any) => ({
          ...entry,
          uploaded: entry?.uploaded ?? false,
        }));
        setLocations(normalized);
      };
      fetchLocations();
    }, [])
  );

  if (checkingAuth) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutButtonText}>Log out</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Your Sessions</Text>
            <Text style={styles.heroSubtitle}>
              Review and manage every route you captured in the field.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/location")}
          >
            <Text style={styles.primaryButtonText}>Record New Session</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={locations}
          keyExtractor={(item, index) =>
            item?.meta?.id?.toString() ??
            `${item?.meta?.Name ?? "record"}-${index}`
          }
          style={styles.list}
          contentContainerStyle={[
            styles.listContainer,
            !locations.length && styles.listContainerEmpty,
          ]}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sessions</Text>
                <Text style={styles.summaryValue}>{locations.length}</Text>
              </View>
              <Text style={styles.summaryHint}>
                Saved sessions stay on this device until you upload or delete
                them.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No recordings yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap “Record New Session” to start capturing GPS points with rich
                metadata.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.recordItem}>
              <TouchableOpacity
                onPress={() => {
                  if (item?.videoUri) {
                    router.push({
                      pathname: "/video" as any,
                      params: {
                        videoUri: item.videoUri,
                        sessionName: item?.meta?.Name ?? "Unnamed",
                      },
                    });
                  } else {
                    Alert.alert(
                      "No video available",
                      "This session does not have an associated video file."
                    );
                  }
                }}
                disabled={!item?.videoUri}
                activeOpacity={item?.videoUri ? 0.7 : 1}
              >
                <Text style={styles.recordTitle}>
                  {item?.meta?.Name ?? "Unnamed"}
                </Text>
                <Text style={styles.metaSummary}>
                  {Object.entries(item?.meta ?? {})
                    .filter(([key]) => key !== "Name")
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" • ") || "No metadata"}
                </Text>
                {item?.videoUri && (
                  <Text style={styles.playHint}>Tap to play video</Text>
                )}
              </TouchableOpacity>
              <View style={styles.recordActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.uploadButton]}
                  onPress={() => handleUpload(item, index)}
                  disabled={uploadingIndex === index}
                >
                  {uploadingIndex === index ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>Upload</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={() => handleSaveToDevice(item, index)}
                  disabled={savingVideoIndex === index}
                >
                  {savingVideoIndex === index ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonTextSecondary}>
                      Save Video
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={() => handleSaveToDevicePath(item, index)}
                  disabled={savingTrackIndex === index}
                >
                  {savingTrackIndex === index ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonTextSecondary}>
                      Save Track
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(index)}
                  disabled={deletingIndex === index}
                >
                  {deletingIndex === index ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonTextDanger}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        {/* Upload Progress Dialog */}
        <Modal
          visible={showUploadDialog}
          transparent
          animationType="fade"
          onRequestClose={() => {}} // Prevent closing during upload
        >
          <View style={styles.uploadDialogOverlay}>
            <View style={styles.uploadDialogBox}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.uploadDialogTitle}>Uploading Session</Text>
              <Text style={styles.uploadDialogStatus}>{uploadStatus}</Text>
              <Text style={styles.uploadDialogHint}>
                Please don't close this screen
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "black",
  },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
    backgroundColor: "black",
  },
  hero: {
    backgroundColor: "black",
    borderRadius: 20,
    padding: 20,
    gap: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    color: "black",
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  logoutButtonText: {
    color: "black",
    fontSize: 14,
    fontWeight: "500",
  },
  heroCopy: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#94a3b8",
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flexGrow: 1,
  },
  listContainer: {
    gap: 16,
    paddingVertical: 4,
  },
  listContainerEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  summaryCard: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cbd5f5",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#38bdf8",
  },
  summaryHint: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
  recordItem: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    gap: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  playHint: {
    fontSize: 12,
    color: "#38bdf8",
    fontStyle: "italic",
    marginTop: -4,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  metaSummary: {
    fontSize: 13,
    color: "#9ca3af",
  },
  recordActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
  },
  uploadButton: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  saveButton: {
    backgroundColor: "#020617",
    borderColor: "rgba(148, 163, 184, 0.6)",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    borderColor: "#b91c1c",
  },
  actionButtonText: {
    color: "#020617",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  actionButtonTextSecondary: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  actionButtonTextDanger: {
    color: "#fef2f2",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  uploadDialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  uploadDialogBox: {
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    minWidth: 280,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  uploadDialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
    marginTop: 20,
    marginBottom: 12,
  },
  uploadDialogStatus: {
    fontSize: 15,
    color: "#38bdf8",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  uploadDialogHint: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});

export default HomeScreen;
