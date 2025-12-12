import { supabase } from "@/lib/supabase";
import { uploadVideoWithFileSystem } from "@/lib/video-upload";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FloatingActionButton from "./components/FloatingActionButton";
import HeroHeader from "./components/HeroHeader";
import MetadataDialog from "./components/MetadataDialog";
import SearchBar from "./components/SearchBar";
import SessionsList from "./components/SessionsList";
import UploadProgressDialog from "./components/UploadProgressDialog";

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

        // Extract User_Name from the nested structure
        // Structure: user.data = "{\"Status\":\"...\",\"Result\":{\"User_Name\":...}}"
        let userName = "";
        if (user?.data && typeof user.data === "string") {
          // user.data is a JSON string, parse it
          const parsedData = JSON.parse(user.data);
          userName = String(parsedData?.Result?.User_Name || "");
        } else if (user?.Result?.User_Name) {
          // Fallback: if Result is already an object
          userName = String(user.Result.User_Name);
        } else if (user?.User_Name) {
          // Fallback: if User_Name is directly on user
          userName = String(user.User_Name);
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
            Created_By: userName,
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

          console.log("geoCodeDataBody", geoCodeDataBody);

          console.log("userId", userId);
          // console.log("user object structure:", {
          //   hasResult: !!user?.Result,
          //   hasUser_id: !!user?.User_id,
          //   keys: Object.keys(user || {}),
          // });

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

              // Close upload dialog
              setShowUploadDialog(false);
              setUploadingIndex(null);
              setUploadStatus("");

              // Show error alert and cancel the process
              Alert.alert(
                "Upload Failed",
                errorMessage ||
                  "Failed to save video geocoded details. The upload process has been cancelled.",
                [{ text: "OK" }]
              );

              // Cancel the process by returning early
              return;
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

  const handleMetaChange = useCallback((key: string, value: string) => {
    setEditedMeta((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveVideoFromDialog = useCallback(() => {
    if (selectedItem && selectedIndex !== null) {
      handleSaveToDevice(selectedItem, selectedIndex);
    }
  }, [selectedItem, selectedIndex, handleSaveToDevice]);

  const handleSaveTrackFromDialog = useCallback(() => {
    if (selectedItem && selectedIndex !== null) {
      handleSaveToDevicePath(selectedItem, selectedIndex);
    }
  }, [selectedItem, selectedIndex, handleSaveToDevicePath]);

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
        <HeroHeader username={username} />

        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hasSessions={locations.length > 0}
        />

        <SessionsList
          locations={locations}
          searchQuery={searchQuery}
          uploadingIndex={uploadingIndex}
          deletingIndex={deletingIndex}
          onEdit={handleCardPress}
          onUpload={handleUpload}
          onDelete={handleDelete}
        />

        {/* Upload Progress Dialog */}
        <UploadProgressDialog
          visible={showUploadDialog}
          uploadStatus={uploadStatus}
        />

        {/* Metadata Dialog */}
        <MetadataDialog
          visible={showMetadataDialog}
          selectedItem={selectedItem}
          selectedIndex={selectedIndex}
          editedMeta={editedMeta}
          savingVideoIndex={savingVideoIndex}
          savingTrackIndex={savingTrackIndex}
          onCancel={handleCancelMetadata}
          onSave={handleSaveMetadata}
          onSaveVideo={handleSaveVideoFromDialog}
          onSaveTrack={handleSaveTrackFromDialog}
          onMetaChange={handleMetaChange}
        />

        {/* Floating Action Button */}
        <FloatingActionButton />
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
});

export default HomeScreen;
