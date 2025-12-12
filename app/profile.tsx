import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ProfileScreen = () => {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            setLoggingOut(true);
            await AsyncStorage.removeItem("user");
            router.replace("/auth");
          } catch (error) {
            console.error("Failed to log out:", error);
            Alert.alert("Logout failed", "Please try again.");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }, [router]);

  // Auth check and load user data
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadUserData = async () => {
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
          console.error("Failed to load user data:", error);
          if (isActive) {
            router.replace("/auth");
          }
        } finally {
          if (isActive) {
            setCheckingAuth(false);
          }
        }
      };

      loadUserData();

      return () => {
        isActive = false;
      };
    }, [router])
  );

  if (checkingAuth) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Get user initials for avatar
  const getInitials = (username: string) => {
    if (!username) return "U";
    const parts = username.trim().split(/[\s@]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return username.substring(0, 2).toUpperCase();
  };

  // Format field names for display
  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Get icon for field type
  const getFieldIcon = (key: string): any => {
    const keyLower = key.toLowerCase();
    if (keyLower.includes("name") || keyLower.includes("username")) {
      return "person";
    }
    if (keyLower.includes("email")) {
      return "email";
    }
    if (keyLower.includes("phone")) {
      return "phone";
    }
    if (keyLower.includes("address")) {
      return "location-on";
    }
    if (keyLower.includes("role") || keyLower.includes("position")) {
      return "badge";
    }
    return "info";
  };

  // Fields to exclude from display
  const excludeFields = [
    "password",
    "id",
    "user_id",
    "manager_id",
    "managerid",
  ];

  // Get user details as array
  const userDetails = user
    ? Object.entries(user)
        .filter(([key]) => !excludeFields.includes(key.toLowerCase()))
        .map(([key, value]) => ({
          key,
          label: formatFieldName(key),
          value: value?.toString() || "N/A",
          icon: getFieldIcon(key),
        }))
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {getInitials(user?.username || "User")}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.username || "User"}</Text>
          </View>

          <View style={styles.detailsSection}>
            {userDetails.map((detail, index) => (
              <TouchableOpacity
                key={index}
                style={styles.detailCard}
                activeOpacity={0.7}
              >
                <View style={styles.detailCardLeft}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons
                      name={detail.icon}
                      size={24}
                      color="#ffffff"
                    />
                  </View>
                  <View style={styles.detailCardText}>
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[
              styles.logoutButton,
              loggingOut && styles.logoutButtonDisabled,
            ]}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="logout" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Log out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(99, 102, 241, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  detailsSection: {
    gap: 12,
  },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    minHeight: 64,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  detailCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailCardText: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "400",
  },
  detailValue: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: "black",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
