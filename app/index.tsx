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
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editedMeta, setEditedMeta] = useState<any>({});
  const [storageInfo, setStorageInfo] = useState<{
    videoCount: number;
    totalVideoSize: number;
    trackCount: number;
    totalTrackSize: number;
    metadataSize: number;
    totalSize: number;
  } | null>(null);

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
        const trackPath = record.pathFile;

        const track = await FileSystem.readAsStringAsync(trackPath);
        const trackData = JSON.parse(track);

        console.log("trackData", trackData);

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
            trackData.length > 0
              ? trackData[trackData.length - 1].Timestamp -
                trackData[0].Timestamp
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
          const videoGeoLocation = trackData.map((point: any) => ({
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

            console.log("geocodedStatus", geocodedStatus);

            if (geocodedStatus === "5004") {
              Alert.alert(
                "Upload Failed",
                "Not enough data for GeoLocation tracking.Try again with more tracking points.",
                [{ text: "OK" }]
              );
              //  Close upload dialog
              setShowUploadDialog(false);
              setUploadingIndex(null);
              setUploadStatus("");
              return;
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
        const trackPath = record.pathFile;
        const track = await FileSystem.readAsStringAsync(trackPath);
        const trackData = JSON.parse(track);
        console.log("trackData", trackData);

        // Convert path array to readable text
        const trackText = JSON.stringify(trackData, null, 2);

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

  const checkStorageUsage = useCallback(async () => {
    try {
      // Check AsyncStorage metadata size
      const recordings = await AsyncStorage.getItem("RECORDINGS");
      const user = await AsyncStorage.getItem("user");

      // Calculate size: JavaScript strings are UTF-16, so each character is 2 bytes
      const recordingsSize = recordings ? recordings.length * 2 : 0;
      const userSize = user ? user.length * 2 : 0;
      const metadataSize = recordingsSize + userSize;

      // Check video files
      const videosDir = FileSystem.documentDirectory + "videos/";
      let videoFiles: any[] = [];
      let totalVideoSize = 0;

      try {
        const videoInfo = await FileSystem.getInfoAsync(videosDir);
        if (videoInfo.exists && videoInfo.isDirectory) {
          const files = await FileSystem.readDirectoryAsync(videosDir);
          for (const file of files) {
            const fileInfo = await FileSystem.getInfoAsync(videosDir + file);
            if (fileInfo.exists && fileInfo.size) {
              totalVideoSize += fileInfo.size;
              videoFiles.push({ name: file, size: fileInfo.size });
            }
          }
        }
      } catch (e) {
        console.log("No videos directory");
      }

      // Check track files
      const pathsDir = FileSystem.documentDirectory + "paths/";
      let trackFiles: any[] = [];
      let totalTrackSize = 0;

      try {
        const trackInfo = await FileSystem.getInfoAsync(pathsDir);
        if (trackInfo.exists && trackInfo.isDirectory) {
          const files = await FileSystem.readDirectoryAsync(pathsDir);
          for (const file of files) {
            const fileInfo = await FileSystem.getInfoAsync(pathsDir + file);
            if (fileInfo.exists && fileInfo.size) {
              totalTrackSize += fileInfo.size;
              trackFiles.push({ name: file, size: fileInfo.size });
            }
          }
        }
      } catch (e) {
        console.log("No paths directory");
      }

      const totalSize = totalVideoSize + totalTrackSize;

      setStorageInfo({
        videoCount: videoFiles.length,
        totalVideoSize,
        trackCount: trackFiles.length,
        totalTrackSize,
        metadataSize,
        totalSize,
      });
    } catch (error) {
      console.error("Error checking storage:", error);
    }
  }, []);

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

                // Get the record before deleting it
                const recordToDelete = locations[indexToRemove];

                // Delete video file from filesystem if it exists
                if (recordToDelete?.videoUri) {
                  try {
                    const videoInfo = await FileSystem.getInfoAsync(
                      recordToDelete.videoUri
                    );
                    if (videoInfo.exists) {
                      await FileSystem.deleteAsync(recordToDelete.videoUri, {
                        idempotent: true,
                      });
                      console.log(
                        "Deleted video file:",
                        recordToDelete.videoUri
                      );
                    }
                  } catch (videoError) {
                    console.error("Error deleting video file:", videoError);
                    // Continue with deletion even if video deletion fails
                  }
                }

                // Delete track file from filesystem if it exists
                if (recordToDelete?.pathFile) {
                  try {
                    const trackInfo = await FileSystem.getInfoAsync(
                      recordToDelete.pathFile
                    );
                    if (trackInfo.exists) {
                      await FileSystem.deleteAsync(recordToDelete.pathFile, {
                        idempotent: true,
                      });
                      console.log(
                        "Deleted track file:",
                        recordToDelete.pathFile
                      );
                    }
                  } catch (trackError) {
                    console.error("Error deleting track file:", trackError);
                    // Continue with deletion even if track deletion fails
                  }
                }

                // Remove from state and AsyncStorage
                const updated = locations.filter(
                  (_, idx) => idx !== indexToRemove
                );
                setLocations(updated);
                await AsyncStorage.setItem(
                  "RECORDINGS",
                  JSON.stringify(updated)
                );

                // Refresh storage info after deletion
                checkStorageUsage();
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
    [locations, checkStorageUsage]
  );

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
      checkStorageUsage();
    }, [checkStorageUsage])
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 KB";
    const mb = bytes / (1024 * 1024);
    // If less than 1 MB, show in KB
    if (mb < 1) {
      const kb = bytes / 1024;
      return Math.round(kb * 100) / 100 + " KB";
    }
    return Math.round(mb * 100) / 100 + " MB";
  };

  const clearAllData = useCallback(async () => {
    try {
      Alert.alert(
        "Clear All Data",
        "This will delete all recordings, track files, and video files. This action cannot be undone. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear All",
            style: "destructive",
            onPress: async () => {
              try {
                setUploadStatus("Clearing all data...");
                setShowUploadDialog(true);

                // 1. Clear AsyncStorage
                setUploadStatus("Clearing AsyncStorage...");
                await AsyncStorage.removeItem("RECORDINGS");
                console.log("Cleared RECORDINGS from AsyncStorage");

                // 2. Delete all track files from paths/ directory
                setUploadStatus("Deleting track files...");
                const pathsDir = FileSystem.documentDirectory + "paths/";
                const pathsDirInfo = await FileSystem.getInfoAsync(pathsDir);

                if (pathsDirInfo.exists && pathsDirInfo.isDirectory) {
                  const files = await FileSystem.readDirectoryAsync(pathsDir);
                  console.log(`Found ${files.length} track files to delete`);

                  for (const file of files) {
                    try {
                      await FileSystem.deleteAsync(pathsDir + file, {
                        idempotent: true,
                      });
                    } catch (error) {
                      console.error(
                        `Failed to delete track file ${file}:`,
                        error
                      );
                    }
                  }
                  console.log("Deleted all track files");
                }

                // 3. Delete all video files from videos/ directory
                setUploadStatus("Deleting video files...");
                const videosDir = FileSystem.documentDirectory + "videos/";
                const videosDirInfo = await FileSystem.getInfoAsync(videosDir);

                if (videosDirInfo.exists && videosDirInfo.isDirectory) {
                  const videoFiles = await FileSystem.readDirectoryAsync(
                    videosDir
                  );
                  console.log(
                    `Found ${videoFiles.length} video files to delete`
                  );

                  for (const file of videoFiles) {
                    try {
                      await FileSystem.deleteAsync(videosDir + file, {
                        idempotent: true,
                      });
                    } catch (error) {
                      console.error(
                        `Failed to delete video file ${file}:`,
                        error
                      );
                    }
                  }
                  console.log("Deleted all video files");
                }

                // 4. Update state
                setLocations([]);
                setShowStorageDialog(false);
                setShowUploadDialog(false);
                setUploadStatus("");

                // Refresh storage info
                await checkStorageUsage();

                Alert.alert(
                  "Success",
                  "All data has been cleared successfully."
                );
              } catch (error) {
                console.error("Error during cleanup:", error);
                setShowUploadDialog(false);
                setUploadStatus("");
                Alert.alert(
                  "Error",
                  "Some files may not have been deleted. Please check manually."
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Failed to clear data:", error);
      setShowUploadDialog(false);
      setUploadStatus("");
      Alert.alert("Error", "Failed to clear data. Please try again.");
    }
  }, [checkStorageUsage]);

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

        {/* Storage Usage Button */}
        <TouchableOpacity
          style={styles.storageButton}
          onPress={() => {
            checkStorageUsage();
            setShowStorageDialog(true);
          }}
        >
          <MaterialIcons name="storage" size={20} color="#000" />
          <Text style={styles.storageButtonText}>View Storage Usage</Text>
        </TouchableOpacity>

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

        {/* Storage Usage Dialog */}
        <Modal
          visible={showStorageDialog}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStorageDialog(false)}
        >
          <View style={styles.storageDialogOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.storageKeyboardAvoidingView}
            >
              <View style={styles.storageDialogBox}>
                <ScrollView
                  style={styles.storageScrollView}
                  contentContainerStyle={styles.storageScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.storageDialogTitleContainer}>
                    <MaterialIcons name="storage" size={24} color="#e2e8f0" />
                    <Text style={styles.storageDialogTitle}>Storage Usage</Text>
                  </View>
                  <Text style={styles.storageDialogSubtitle}>
                    View and manage your storage
                  </Text>

                  {storageInfo ? (
                    <>
                      <View style={styles.storageRow}>
                        <Text style={styles.storageLabel}>Records:</Text>
                        <Text style={styles.storageValue}>
                          {locations.length}
                        </Text>
                      </View>
                      <View style={styles.storageRow}>
                        <Text style={styles.storageLabel}>Videos:</Text>
                        <Text style={styles.storageValue}>
                          {storageInfo.videoCount} (
                          {formatBytes(storageInfo.totalVideoSize)})
                        </Text>
                      </View>
                      <View style={styles.storageRow}>
                        <Text style={styles.storageLabel}>Track Files:</Text>
                        <Text style={styles.storageValue}>
                          {storageInfo.trackCount} (
                          {formatBytes(storageInfo.totalTrackSize)})
                        </Text>
                      </View>
                      <View style={styles.storageRow}>
                        <Text style={styles.storageLabel}>Metadata:</Text>
                        <Text style={styles.storageValue}>
                          {formatBytes(storageInfo.metadataSize)}
                        </Text>
                      </View>
                      <View style={[styles.storageRow, styles.storageTotal]}>
                        <Text style={styles.storageTotalLabel}>
                          Total Storage:
                        </Text>
                        <Text style={styles.storageTotalValue}>
                          {formatBytes(storageInfo.totalSize)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.storageLoading}>
                      <ActivityIndicator size="small" color="#38bdf8" />
                      <Text style={styles.storageLoadingText}>
                        Loading storage info...
                      </Text>
                    </View>
                  )}

                  <View style={styles.storageDialogButtons}>
                    <TouchableOpacity
                      style={[
                        styles.storageDialogButton,
                        styles.storageDialogButtonRefresh,
                      ]}
                      onPress={checkStorageUsage}
                    >
                      <MaterialIcons name="refresh" size={20} color="#60a5fa" />
                      <Text style={styles.storageDialogButtonRefreshText}>
                        Refresh
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.storageDialogButton,
                        styles.storageDialogButtonClear,
                      ]}
                      onPress={clearAllData}
                    >
                      <MaterialIcons
                        name="delete-sweep"
                        size={20}
                        color="#f87171"
                      />
                      <Text style={styles.storageDialogButtonClearText}>
                        Clear All
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.storageDialogButton,
                      styles.storageDialogButtonCancel,
                    ]}
                    onPress={() => setShowStorageDialog(false)}
                  >
                    <MaterialIcons name="close" size={20} color="#cbd5f5" />
                    <Text style={styles.storageDialogButtonCancelText}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

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
  storageButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  storageButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  storageDialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  storageKeyboardAvoidingView: {
    width: "100%",
    maxHeight: "90%",
  },
  storageDialogBox: {
    backgroundColor: "black",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#222222",
    overflow: "hidden",
  },
  storageScrollView: {
    flexGrow: 0,
  },
  storageScrollContent: {
    padding: 24,
    gap: 16,
  },
  storageDialogTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storageDialogTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  storageDialogSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  storageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  storageLabel: {
    fontSize: 15,
    color: "#94a3b8",
  },
  storageValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  storageTotal: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  storageTotalLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#cbd5f5",
  },
  storageTotalValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#38bdf8",
  },
  storageLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
  },
  storageLoadingText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  storageDialogButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  storageDialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  storageDialogButtonRefresh: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  storageDialogButtonClear: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  storageDialogButtonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    marginTop: 8,
  },
  storageDialogButtonRefreshText: {
    color: "#60a5fa",
    fontSize: 15,
    fontWeight: "600",
  },
  storageDialogButtonClearText: {
    color: "#f87171",
    fontSize: 15,
    fontWeight: "600",
  },
  storageDialogButtonCancelText: {
    color: "#cbd5f5",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default HomeScreen;
