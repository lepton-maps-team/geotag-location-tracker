import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const HomeScreen = () => {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [locations, setLocations] = useState<any>([]);

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
        console.log("Loaded Locations:", parsed);
        setLocations(parsed);
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
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/location")}
      >
        <Text style={styles.buttonText}>Record Location</Text>
      </TouchableOpacity>
      <Text>Recorded Locations: {locations.length}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    flex: 1,

    alignItems: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 16, color: "#6b7280" },
  button: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

export default HomeScreen;
