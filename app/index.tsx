import DatePicker from "@/components/DatePicker";
import SessionCard from "@/components/SessionCard";
import { supabase } from "@/lib/supabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
  TextInput,
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
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Get user initials for avatar
  const getInitials = useCallback((username: string) => {
    if (!username) return "U";
    const parts = username.trim().split(/[\s@]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return username.substring(0, 2).toUpperCase();
  }, []);

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
        console.log(user);
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

        //    console.log(data);

        await supabase.from("surveys").insert({
          name: record?.meta?.Name,
          gps_track_id: data.id,
          timestamp: Date.now(),
          user_id: user.user_id,
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
          //   console.log("shareAsync", res);
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

  const handleEdit = useCallback(
    async (indexToEdit: number, updatedMeta: any) => {
      try {
        const updated = [...locations];
        updated[indexToEdit] = {
          ...updated[indexToEdit],
          meta: updatedMeta,
        };
        setLocations(updated);
        await AsyncStorage.setItem("RECORDINGS", JSON.stringify(updated));
        Alert.alert("Success", "Session metadata updated successfully.");
      } catch (error) {
        console.error("Failed to update metadata:", error);
        Alert.alert("Error", "Failed to update metadata. Please try again.");
      }
    },
    [locations]
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
          if (storedUser && isActive) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
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

  // console.log(locations?.length > 0 ? locations[0].path : []);

  // Filter locations based on search query and date
  const filteredLocations = locations.filter((item) => {
    // Filter by date if date is selected
    if (selectedDate) {
      const sessionDate = item?.meta?.DateTime;
      if (!sessionDate) return false;
      try {
        const sessionDateObj = new Date(sessionDate);
        const filterDateObj = new Date(selectedDate);
        // Compare dates (ignore time)
        const sessionDateStr = sessionDateObj.toDateString();
        const filterDateStr = filterDateObj.toDateString();
        if (sessionDateStr !== filterDateStr) {
          return false;
        }
      } catch {
        return false;
      }
    }
    // Filter by search query
    if (!searchQuery.trim()) return true;
    const name = item?.meta?.Name?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase().trim());
  });

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleClearDate = () => {
    setSelectedDate("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>
                Hi {user?.username || "User"}
              </Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={styles.avatarButton}
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {getInitials(user?.username || "U")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color="#94a3b8"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search sessions..."
                placeholderTextColor="#828282"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                >
                  <MaterialIcons name="close" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.dateButton,
                selectedDate && styles.dateButtonActive,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons
                name="calendar-today"
                size={20}
                color={selectedDate ? "#ffffff" : "#94a3b8"}
              />
            </TouchableOpacity>
          </View>
          {selectedDate && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity
                onPress={handleClearDate}
                style={styles.dateBadgeClose}
              >
                <MaterialIcons name="close" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Date Picker Component */}
        <DatePicker
          visible={showDatePicker}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
        />
        <FlatList
          data={filteredLocations}
          keyExtractor={(item, index) =>
            item?.meta?.id?.toString() ??
            `${item?.meta?.Name ?? "record"}-${index}`
          }
          style={styles.list}
          contentContainerStyle={[
            styles.listContainer,
            !filteredLocations.length && styles.listContainerEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {selectedDate ? "No surveys found" : "No recordings yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedDate
                  ? `No surveys found for ${new Date(
                      selectedDate
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}.`
                  : 'Tap "Record New Session" to start capturing GPS points with rich metadata.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            // Find the original index in the full locations array
            const originalItemIndex = locations.findIndex(
              (loc) => loc === item
            );
            return (
              <SessionCard
                item={item}
                originalIndex={originalItemIndex}
                onUpload={() => handleUpload(item, originalItemIndex)}
                onSave={() => handleSaveToDevice(item, originalItemIndex)}
                onDelete={() => handleDelete(originalItemIndex)}
                onEdit={(updatedMeta) =>
                  handleEdit(originalItemIndex, updatedMeta)
                }
                isUploading={uploadingIndex === originalItemIndex}
                isSaving={savingIndex === originalItemIndex}
                isDeleting={deletingIndex === originalItemIndex}
              />
            );
          }}
        />
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/location")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={28} color="#000000" />
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 20,
    backgroundColor: "black",
  },
  hero: {
    backgroundColor: "black",
    borderRadius: 20,
    padding: 16,
    gap: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingContainer: {
    flex: 1,
    justifyContent: "center",
    height: 40,
    gap: 2,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e2e8f0",
    lineHeight: 20,
  },
  dateText: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
  },
  avatarButton: {
    padding: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(99, 102, 241, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    flex: 1,
  },
  dateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  dateButtonActive: {
    backgroundColor: "rgba(99, 102, 241, 0.9)",
    borderColor: "rgba(99, 102, 241, 0.5)",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    gap: 8,
  },
  dateBadgeText: {
    fontSize: 13,
    color: "#cbd5f5",
    fontWeight: "500",
  },
  dateBadgeClose: {
    padding: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#828282",
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  fab: {
    position: "absolute",
    right: 32,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
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
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#828282",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#828282",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default HomeScreen;
