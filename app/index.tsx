import { supabase } from "@/lib/supabase";
import { uploadVideoWithFileSystem } from "@/lib/video-upload";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import Svg, { Circle, Path } from "react-native-svg";

const RouteIcon = ({
  size = 24,
  color = "#3b82f6",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="6"
      cy="19"
      r="3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="18"
      cy="5"
      r="3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PencilIcon = ({
  size = 24,
  color = "#94a3b8",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="m15 5 4 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlayIcon = ({
  size = 24,
  color = "#3b82f6",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = ({
  size = 24,
  color = "#FF4C4C",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10 11v6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 11v6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 6h18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UploadIcon = ({
  size = 24,
  color = "#4DA3FF",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3v12"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="m17 8-5-5-5 5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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
  const [username, setUsername] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editedMeta, setEditedMeta] = useState<any>({});

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
        console.log("[upload] start", { index, hasVideo: !!record?.videoUri });

        const storedUser = await AsyncStorage.getItem("user");
        const user = JSON.parse(storedUser as string);
        console.log("user", user);

        // Extract User_id from the nested structure
        // Structure: user.data = "{\"Status\":\"...\",\"Result\":{\"User_id\":...}}"
        let userId = "";
        if (user?.data && typeof user.data === "string") {
          // user.data is a JSON string, parse it
          const parsedData = JSON.parse(user.data);
          userId = String(parsedData?.Result?.User_id || "");
        } else if (user?.Result?.User_id) {
          // Fallback: if Result is already an object
          userId = String(user.Result.User_id);
        } else if (user?.User_id) {
          // Fallback: if User_id is directly on user
          userId = String(user.User_id);
        }

        if (!userId) {
          console.error("Could not extract User_id from user object:", user);
          throw new Error("User_id not found in user data");
        }

        console.log("userId", userId);
        const track = record.path;

        console.log("track", track);

        if (record.videoUri) {
          setUploadStatus("Generating video ID...");

          // Generate random ID in format: timestamp1_timestamp2
          const timestamp1 = Date.now();
          const timestamp2 = Date.now() - Math.floor(Math.random() * 100000);
          const videoId = `${timestamp1}_${timestamp2}`;
          const videoFileName = `${videoId}.mp4`;

          // Upload video to R2 storage with the generated ID
          setUploadStatus("Uploading video to storage...");
          console.log("record.videoUri", record.videoUri);
          console.log("videoId", videoId);
          const videoMetadata = await uploadVideoWithFileSystem(
            record.videoUri,
            videoId
          );

          console.log(videoMetadata.finalUrl, "videoMetadata.finalUrl");
          console.log("[upload] video metadata", videoMetadata);

          // Upload to Mux
          setUploadStatus("Uploading to Mux...");
          let muxResponse;
          try {
            muxResponse = await axios.post(
              "https://mfjafqxrfpfkwyroendp.supabase.co/functions/v1/create-mux-asset",
              {
                videoUrl: videoMetadata.finalUrl,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mamFmcXhyZnBma3d5cm9lbmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ0MTgsImV4cCI6MjA2NTM4MDQxOH0.LI3bPG_kFe4d1TCz5pUV2X05dicHuGDK0PB_pT3fBuI"}`,
                },
              }
            );
            console.log("Success", muxResponse.data);
          } catch (error) {
            console.log("AXIOS ERROR:", JSON.stringify(error, null, 2));
          }

          // Calculate video duration from track timestamps (in seconds)
          const videoDuration =
            track.length > 0
              ? track[track.length - 1].Timestamp - track[0].Timestamp
              : 0;

          // Format capture time from recordedAt timestamp
          const recordedAt = record?.meta?.recordedAt || Date.now();
          const captureDate = new Date(recordedAt);
          const captureTime = `${String(captureDate.getDate()).padStart(
            2,
            "0"
          )}-${String(captureDate.getMonth() + 1).padStart(
            2,
            "0"
          )}-${captureDate.getFullYear()} ${String(
            captureDate.getHours()
          ).padStart(2, "0")}:${String(captureDate.getMinutes()).padStart(
            2,
            "0"
          )}:${String(captureDate.getSeconds()).padStart(2, "0")}`;

          const routeId = record?.meta?.route;

          const entityId = record?.meta?.entity;

          // Convert location path to videoGeoLocation format
          const videoGeoLocation = track.map((point: any) => ({
            Latitude: String(point.Latitude),
            Longitude: String(point.Longitude),
            Accuracy: point.Accuracy ? String(point.Accuracy) : "0",
            timeStamp: String(point.Timestamp),
          }));
          console.log("[upload] geo payload preview", {
            first: videoGeoLocation[0],
            total: videoGeoLocation.length,
          });

          // Save video geocoded details
          setUploadStatus("Saving video geocoded details...");

          const geoCodeDataBody = JSON.stringify({
            Video_ID: videoFileName,
            Video_Duration: String(videoDuration),
            Capture_Time: captureTime,
            Created_By: user.User_Name || user.First_Name || "Unknown",
            Route_ID: "1",
            Entity_ID: "5",
            Video_Name: record?.meta?.videoName || "Unnamed",
            Remarks: record?.meta?.childRing || "",
            videoGeoLocation: videoGeoLocation,
            Depth_Points: [],
            is_supabase_upload: true,
            supabase_id: videoFileName,
            block: record?.meta?.blockName || "",
          });

          console.log("userId", userId);
          console.log("user object structure:", {
            hasResult: !!user?.Result,
            hasUser_id: !!user?.User_id,
            keys: Object.keys(user || {}),
          });

          try {
            const geocodedResponse = await axios.post(
              "https://networkaccess.st.leptonsoftware.com:8056/api/Video/SaveVideoGeocodedDetails",
              {
                data: geoCodeDataBody,
              },
              {
                headers: {
                  userId,
                },
              }
            );
            console.log("[upload] geocoded response", geocodedResponse.data);

            // Parse the nested response structure
            let geocodedStatus = "";
            let geocodedMessage = "";
            if (
              geocodedResponse?.data?.data &&
              typeof geocodedResponse.data.data === "string"
            ) {
              // Response has nested data structure: {data: "{\"Status\":\"...\",\"Message\":\"...\"}"}
              const parsedData = JSON.parse(geocodedResponse.data.data);
              geocodedStatus = parsedData?.Status || "";
              geocodedMessage = parsedData?.Message || "";
            } else if (geocodedResponse?.data?.Status) {
              // Direct structure: {Status: "...", Message: "..."}
              geocodedStatus = geocodedResponse.data.Status;
              geocodedMessage = geocodedResponse.data.Message || "";
            }

            // Check if status is success (5001)
            if (geocodedStatus !== "5001") {
              const errorMessage =
                geocodedMessage || "Failed to save video geocoded details";
              console.error("[upload] Geocoded API error:", {
                status: geocodedStatus,
                message: geocodedMessage,
                response: geocodedResponse.data,
              });
              throw new Error(
                `Geocoded details API error (Status: ${geocodedStatus}): ${errorMessage}`
              );
            }

            console.log("[upload] Geocoded details saved successfully");

            const { data, error } = await supabase.from("videos").insert({
              mux_playback_url: muxResponse?.data?.playback_id,
              asset_id: muxResponse?.data?.asset_id,
              name: videoFileName,
            });

            if (error) {
              console.error("Failed to save video to Supabase:", error);
              throw new Error("Failed to save video to Supabase");
            }

            setUploadStatus("Finalizing...");
            const updated = [...locations];
            updated[index] = { ...record, uploaded: true };
            setLocations(updated);
            await AsyncStorage.setItem("RECORDINGS", JSON.stringify(updated));

            // Close dialog and show success
            setShowUploadDialog(false);
            Alert.alert(
              "Uploaded",
              `Uploaded ${record?.meta?.videoName} successfully.`
            );
          } catch (error) {
            console.log("AXIOS ERROR:", JSON.stringify(error, null, 2));
          }
        } else {
          setUploadStatus("No video to upload, skipping...");
          console.log("[upload] no video present for record", { index });
        }

        // Update local storage
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
        const fileName = `${record?.meta?.videoName || "path"}-${randomId}.txt`;

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
      const sessionName =
        locations[indexToRemove]?.meta?.videoName ?? "this session";
      Alert.alert(
        "⚠️ Delete Session",
        `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {}, // Do nothing on cancel
          },
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
        ],
        { cancelable: true }
      );
    },
    [locations]
  );

  const handleCardPress = useCallback((item: any, index: number) => {
    setSelectedItem(item);
    setSelectedIndex(index);
    setEditedMeta({ ...item.meta });
    setShowMetadataDialog(true);
  }, []);

  const handleSaveMetadata = useCallback(async () => {
    if (selectedIndex === null || !selectedItem) return;

    try {
      const updated = [...locations];
      updated[selectedIndex] = {
        ...selectedItem,
        meta: editedMeta,
      };
      setLocations(updated);
      await AsyncStorage.setItem("RECORDINGS", JSON.stringify(updated));
      setShowMetadataDialog(false);
      setSelectedItem(null);
      setSelectedIndex(null);
      setEditedMeta({});
    } catch (error) {
      console.error("Failed to save metadata:", error);
      Alert.alert("Error", "Failed to save metadata. Please try again.");
    }
  }, [selectedIndex, selectedItem, editedMeta, locations]);

  const handleCancelMetadata = useCallback(() => {
    setShowMetadataDialog(false);
    setSelectedItem(null);
    setSelectedIndex(null);
    setEditedMeta({});
  }, []);

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

  // ✅ Fetch stored locations and user data
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

      const fetchUserData = async () => {
        try {
          const storedUser = await AsyncStorage.getItem("user");
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Extract user data from the nested structure
            let extractedData: any = {};
            if (parsedUser?.data && typeof parsedUser.data === "string") {
              const parsedData = JSON.parse(parsedUser.data);
              extractedData = parsedData?.Result || {};
            } else if (parsedUser?.Result) {
              extractedData = parsedUser.Result;
            } else {
              extractedData = parsedUser;
            }

            // Get username
            const userName =
              extractedData?.User_Name ||
              extractedData?.First_Name ||
              extractedData?.Full_Name ||
              "User";
            setUsername(userName);
          }
        } catch (error) {
          console.error("Failed to load user data:", error);
        }
      };

      fetchLocations();
      fetchUserData();
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
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Hi, {username || "User"}</Text>
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
              onPress={() => router.push("/account")}
              style={styles.avatarButton}
            >
              <View style={styles.avatarIconContainer}>
                <MaterialIcons name="person" size={24} color="#000" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={locations.length > 0 ? "#94a3b8" : "#6b7280"}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              locations.length === 0 && styles.searchInputDisabled,
            ]}
            placeholder="Search"
            placeholderTextColor={locations.length > 0 ? "#94a3b8" : "#6b7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={locations.length > 0}
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

        <FlatList
          data={locations.filter((item) => {
            if (!searchQuery.trim()) return true;
            const name = item?.meta?.videoName?.toLowerCase() || "";
            return name.includes(searchQuery.toLowerCase().trim());
          })}
          keyExtractor={(item, index) =>
            item?.meta?.id?.toString() ??
            `${item?.meta?.videoName ?? "record"}-${index}`
          }
          style={styles.list}
          contentContainerStyle={[
            styles.listContainer,
            !locations.length && styles.listContainerEmpty,
          ]}
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
              <View style={styles.recordItemContent}>
                {/* Icon on the left */}
                <View style={styles.recordItemIcon}>
                  <RouteIcon size={32} color="#87CEEB" />
                </View>

                {/* Content area (name, date, buttons) */}
                <View style={styles.recordItemMain}>
                  {/* Top row: Session name and date */}
                  <View style={styles.recordItemHeader}>
                    <Text style={styles.recordTitle}>
                      {item?.meta?.videoName ?? "Unnamed"}
                    </Text>
                    {item?.meta?.recordedAt && (
                      <Text style={styles.recordDate}>
                        {new Date(item.meta.recordedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </Text>
                    )}
                  </View>

                  {/* Buttons row */}
                  <View style={styles.recordActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonIcon]}
                      onPress={() => handleCardPress(item, index)}
                    >
                      <PencilIcon size={16} color="#6b7280" />
                    </TouchableOpacity>
                    {item?.videoUri && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonIcon]}
                        onPress={() => {
                          router.push({
                            pathname: "/video" as any,
                            params: {
                              videoUri: item.videoUri,
                              sessionName: item?.meta?.videoName ?? "Unnamed",
                            },
                          });
                        }}
                      >
                        <PlayIcon size={16} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                    {item?.uploaded ? (
                      <View
                        style={[styles.actionButton, styles.actionButtonIcon]}
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={16}
                          color="#6b7280"
                        />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonIcon]}
                        onPress={() => handleUpload(item, index)}
                        disabled={uploadingIndex === index}
                      >
                        {uploadingIndex === index ? (
                          <ActivityIndicator color="#6b7280" size="small" />
                        ) : (
                          <UploadIcon size={16} color="#6b7280" />
                        )}
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonIcon]}
                      onPress={() => handleDelete(index)}
                      disabled={deletingIndex === index}
                    >
                      {deletingIndex === index ? (
                        <ActivityIndicator color="#6b7280" size="small" />
                      ) : (
                        <TrashIcon size={16} color="#6b7280" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
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

        {/* Metadata Dialog */}
        <Modal
          visible={showMetadataDialog}
          transparent
          animationType="slide"
          onRequestClose={handleCancelMetadata}
        >
          <View style={styles.metadataDialogOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardAvoidingView}
            >
              <View style={styles.metadataDialogBox}>
                <ScrollView
                  style={styles.metadataScrollView}
                  contentContainerStyle={styles.metadataScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.metadataDialogTitle}>
                    Session Details
                  </Text>
                  <Text style={styles.metadataDialogSubtitle}>
                    Edit session metadata
                  </Text>

                  {selectedItem?.meta?.recordedAt && (
                    <View style={styles.metadataDateContainer}>
                      <MaterialIcons
                        name="calendar-today"
                        size={16}
                        color="#94a3b8"
                      />
                      <Text style={styles.metadataDateText}>
                        {new Date(
                          selectedItem.meta.recordedAt
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  )}

                  {Object.entries(editedMeta || {})
                    .filter(
                      ([key]) =>
                        key !== "videoPath" &&
                        key !== "childRing" &&
                        key !== "recordedAt"
                    )
                    .map(([key, value]) => (
                      <View key={key} style={styles.metadataField}>
                        <Text style={styles.metadataFieldLabel}>
                          {key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase())}
                        </Text>
                        <TextInput
                          style={styles.metadataInput}
                          value={String(value || "")}
                          onChangeText={(text) =>
                            setEditedMeta({ ...editedMeta, [key]: text })
                          }
                          placeholder={`Enter ${key}`}
                          placeholderTextColor="#6b7280"
                        />
                      </View>
                    ))}

                  {/* Save Video and Save Track Buttons */}
                  <View style={styles.metadataSaveActions}>
                    <TouchableOpacity
                      style={[
                        styles.metadataSaveButton,
                        (!selectedItem?.videoUri ||
                          savingVideoIndex === selectedIndex) &&
                          styles.metadataSaveButtonDisabled,
                      ]}
                      onPress={() => {
                        if (selectedItem && selectedIndex !== null) {
                          handleSaveToDevice(selectedItem, selectedIndex);
                        }
                      }}
                      disabled={
                        !selectedItem?.videoUri ||
                        savingVideoIndex === selectedIndex
                      }
                    >
                      {savingVideoIndex === selectedIndex ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <MaterialIcons name="videocam" size={20} color="#fff" />
                      )}
                      <Text style={styles.metadataSaveButtonText}>
                        Save Video
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.metadataSaveButton,
                        savingTrackIndex === selectedIndex &&
                          styles.metadataSaveButtonDisabled,
                      ]}
                      onPress={() => {
                        if (selectedItem && selectedIndex !== null) {
                          handleSaveToDevicePath(selectedItem, selectedIndex);
                        }
                      }}
                      disabled={savingTrackIndex === selectedIndex}
                    >
                      {savingTrackIndex === selectedIndex ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <MaterialIcons name="route" size={20} color="#fff" />
                      )}
                      <Text style={styles.metadataSaveButtonText}>
                        Save Track
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.metadataDialogButtons}>
                    <TouchableOpacity
                      style={[
                        styles.metadataDialogButton,
                        styles.metadataDialogButtonCancel,
                      ]}
                      onPress={handleCancelMetadata}
                    >
                      <Text style={styles.metadataDialogButtonCancelText}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.metadataDialogButton,
                        styles.metadataDialogButtonSave,
                      ]}
                      onPress={handleSaveMetadata}
                    >
                      <Text style={styles.metadataDialogButtonSaveText}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/location")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={28} color="#000" />
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
    paddingHorizontal: 20,
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
    gap: 4,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  dateText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 12,
    marginHorizontal: 16,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#e2e8f0",
    padding: 0,
  },
  searchInputDisabled: {
    color: "#6b7280",
    opacity: 0.6,
  },
  clearButton: {
    padding: 4,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarIconContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F4FD",
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
  list: {
    flexGrow: 1,
    marginHorizontal: 16,
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
    backgroundColor: "#111111",
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  recordItemContent: {
    flexDirection: "row",
    gap: 12,
  },
  recordItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordItemMain: {
    flex: 1,
    gap: 8,
  },
  recordItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playHint: {
    fontSize: 12,
    color: "#38bdf8",
    fontStyle: "italic",
    marginTop: -4,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
  },
  recordDate: {
    fontSize: 13,
    color: "#94a3b8",
    marginLeft: 8,
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonIcon: {
    flex: 0,
    width: 40,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "#1e1e1e",
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonSmall: {
    flex: 0,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  playButton: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  uploadButton: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  uploadedButton: {
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
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
  actionButtonTextPlay: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  actionButtonTextUploaded: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
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
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  metadataDialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  keyboardAvoidingView: {
    width: "100%",
    maxHeight: "90%",
  },
  metadataDialogBox: {
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    overflow: "hidden",
  },
  metadataScrollView: {
    flexGrow: 0,
  },
  metadataScrollContent: {
    padding: 24,
    gap: 16,
  },
  metadataDialogTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  metadataDialogSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  metadataDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 8,
  },
  metadataDateText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  metadataField: {
    gap: 8,
  },
  metadataFieldLabel: {
    fontSize: 13,
    color: "#cbd5f5",
    fontWeight: "500",
  },
  metadataInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#e2e8f0",
    backgroundColor: "rgba(31, 41, 55, 0.5)",
  },
  metadataDialogButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metadataDialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  metadataDialogButtonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  metadataDialogButtonSave: {
    backgroundColor: "white",
  },
  metadataDialogButtonCancelText: {
    color: "#cbd5f5",
    fontSize: 15,
    fontWeight: "600",
  },
  metadataDialogButtonSaveText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  metadataSaveActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metadataSaveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  metadataSaveButtonDisabled: {
    opacity: 0.5,
  },
  metadataSaveButtonText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default HomeScreen;
