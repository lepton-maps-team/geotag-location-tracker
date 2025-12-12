import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HeroHeaderProps {
  username: string;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({ username }) => {
  const router = useRouter();

  return (
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
  );
};

const styles = StyleSheet.create({
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
    fontSize: 14,
    color: "#94a3b8",
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
});

export default HeroHeader;
