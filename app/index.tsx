import { supabase } from "@/lib/supabase";
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
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

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
        const storedUser = await AsyncStorage.getItem("user");
        const user = JSON.parse(storedUser as string);
        const track = record.path;
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

        await supabase.from("surveys").insert({
          name: record?.meta?.Name,
          gps_track_id: data.id,
          timestamp: Date.now(),
          user_id: user.id,
          state: record?.meta?.State,
          district: record?.meta?.District,
          block: record?.meta?.Block,
          ring: record?.meta?.Ring,
          child_ring: record?.meta?.ChildRing,
        });
        const updated = [...locations];
        updated[index] = { ...record, uploaded: true };
        setLocations(updated);
        await AsyncStorage.setItem("RECORDINGS", JSON.stringify(updated));
        Alert.alert("Uploaded", `Uploaded ${data.name} successfully.`);
      } catch (error) {
        console.error("Failed to upload recording:", error);
        Alert.alert(
          "Upload failed",
          "We couldn't upload the file. Please try again."
        );
      } finally {
        setUploadingIndex(null);
      }
    },
    [locations]
  );

  const handleSaveToDevice = useCallback(async (record: any, index: number) => {
    try {
      setSavingIndex(index);
      const randomId = Math.random().toString(36).substring(2, 10);
      const fileName = `${record?.meta?.Name || "record"}-${randomId}.txt`;

      const directoryUri = FileSystem.documentDirectory;
      const fileUri = directoryUri + fileName;

      FileSystem.writeAsStringAsync(fileUri, JSON.stringify(record));
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        try {
          const res = await Sharing.shareAsync(fileUri);
          console.log("shareAsync", res);
          return true;
        } catch {
          return false;
        }
      } else {
        alert("You need to give permission to share.");
      }
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save file.\n\nError: ${error.message || error}`);
    } finally {
      setSavingIndex(null);
    }
  }, []);

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
              <Text style={styles.recordTitle}>
                {item?.meta?.Name ?? "Unnamed"}
              </Text>
              <Text style={styles.metaSummary}>
                {Object.entries(item?.meta ?? {})
                  .filter(([key]) => key !== "Name")
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" • ") || "No metadata"}
              </Text>
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
                  disabled={savingIndex === index}
                >
                  {savingIndex === index ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>Save</Text>
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
                    <Text style={styles.actionButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
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
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButton: {
    backgroundColor: "rgba(16, 185, 129, 0.9)",
  },
  saveButton: {
    backgroundColor: "rgba(99, 102, 241, 0.9)",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.9)",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default HomeScreen;
