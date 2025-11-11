import { Link } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const tips = [
  "Capture a short note after every session so teammates know what changed.",
  "Upload recordings once you regain connectivity to keep your workspace in sync.",
  "Use the metadata fields to group sessions by region and assignment.",
];

export default function ModalScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Field session tips</Text>
          <Text style={styles.subtitle}>
            Keep these best practices in mind so every GPS capture tells the
            full story.
          </Text>

          <View style={styles.tipList}>
            {tips.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.bullet} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <Link href="/" dismissTo asChild>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Back to dashboard</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(2, 6, 23, 0.92)",
    padding: 24,
    borderRadius: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#94a3b8",
  },
  tipList: {
    gap: 12,
  },
  tipRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: "#38bdf8",
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: "#cbd5f5",
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
});
