import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Field label mapping for user-friendly display names
const FIELD_LABELS: Record<string, string> = {
  User_Name: "Username",
  First_Name: "First Name",
  Last_Name: "Last Name",
  User_Email: "Email",
  Session_ID: "Session ID",
  Agency_Name: "Agency Name",
  User_Role: "User Role",
  User_id: "User ID",
  Full_Name: "Full Name",
  Email: "Email",
  Location: "Location",
  Address: "Address",
  Bio: "Bio",
};

const AccountScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userDataFields, setUserDataFields] = useState<
    Array<{ key: string; label: string; value: string }>
  >([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      console.log("storedUser", storedUser);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

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

        // Convert all Result fields to display format
        const fields: Array<{ key: string; label: string; value: string }> = [];
        Object.keys(extractedData).forEach((key) => {
          const value = extractedData[key];
          // Only include fields with values (skip null/undefined)
          if (value !== null && value !== undefined) {
            fields.push({
              key,
              label: FIELD_LABELS[key] || key.replace(/_/g, " "),
              value: String(value),
            });
          }
        });

        // Sort fields to show important ones first
        const priorityOrder = [
          "First_Name",
          "Last_Name",
          "Full_Name",
          "User_Name",
          "User_Email",
          "Email",
          "User_Role",
          "Agency_Name",
          "User_id",
          "Session_ID",
        ];
        fields.sort((a, b) => {
          const aIndex = priorityOrder.indexOf(a.key);
          const bIndex = priorityOrder.indexOf(b.key);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

        setUserDataFields(fields);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("user");
            router.replace("/auth");
          } catch (error) {
            console.error("Failed to log out:", error);
            Alert.alert("Logout failed", "Please try again.");
          }
        },
      },
    ]);
  }, [router]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - Fixed at top */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Content Card */}
        <View style={styles.contentCard}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={60} color="#38bdf8" />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialIcons name="camera-alt" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* User Info Fields */}
          <View style={styles.fieldsContainer}>
            {userDataFields.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={
                      field.key === "Bio" || field.value.length > 50
                        ? [styles.input, styles.bioInput]
                        : styles.input
                    }
                    value={field.value}
                    editable={false}
                    placeholder={field.label}
                    placeholderTextColor="#6B7280"
                    multiline={field.key === "Bio" || field.value.length > 50}
                    numberOfLines={
                      field.key === "Bio" || field.value.length > 50 ? 4 : 1
                    }
                    keyboardType={
                      field.key.includes("Email") ? "email-address" : "default"
                    }
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "black",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "black",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  headerSpacer: {
    width: 40,
  },
  contentCard: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 32,
    minHeight: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#38bdf8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(15, 23, 42, 0.65)",
  },
  fieldsContainer: {
    width: "100%",
    gap: 20,
    marginBottom: 32,
  },
  field: {
    width: "100%",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94a3b8",
    marginBottom: 4,
  },
  inputContainer: {
    width: "100%",
    backgroundColor: "rgba(31, 41, 55, 0.5)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    color: "#e2e8f0",
    padding: 0,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  logoutButton: {
    width: "100%",
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AccountScreen;
